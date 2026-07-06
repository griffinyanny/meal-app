import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { recipeRouter } from "./recipe";
import { recipes } from "@/server/db/schema";
import type { Context } from "../init";

// Covers recipeRouter.favorite and recipeRouter.delete. See recipe.test.ts
// for list/get/search (split to stay under the 300-line test file limit).
const RECIPE_ID = "11111111-1111-4111-8111-111111111111";

type Chain = PromiseLike<unknown> & {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeMutationChain(returning: unknown[]): Chain {
  const chain = {} as Chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returning));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(returning).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
  };
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  __updateReturning: unknown[];
  __deleteReturning: unknown[];
}

function createMockDb(): MockDb {
  const state: MockDb = {
    query: { householdMembers: { findFirst: vi.fn() } },
    update: vi.fn(() => makeMutationChain(state.__updateReturning)),
    delete: vi.fn(() => makeMutationChain(state.__deleteReturning)),
    __updateReturning: [],
    __deleteReturning: [],
  };
  return state;
}

const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  email: "griffin@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
};

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

describe("recipeRouter.favorite", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.favorite({ id: RECIPE_ID, isFavorite: true })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.favorite({ id: RECIPE_ID, isFavorite: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should throw NOT_FOUND when the recipe isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__updateReturning = [];

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.favorite({ id: RECIPE_ID, isFavorite: true })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should update the favorite flag scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const updated = { id: RECIPE_ID, isFavorite: true };
    db.__updateReturning = [updated];

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.favorite({ id: RECIPE_ID, isFavorite: true });

    expect(result).toEqual(updated);
    const chain = db.update.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(recipes.id, RECIPE_ID), eq(recipes.householdId, "household-1"))
    );
  });
});

describe("recipeRouter.delete", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(caller.delete({ id: RECIPE_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.delete({ id: RECIPE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should throw NOT_FOUND when the recipe isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__deleteReturning = [];

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.delete({ id: RECIPE_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should delete the recipe scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__deleteReturning = [{ id: RECIPE_ID }];

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.delete({ id: RECIPE_ID });

    expect(result).toEqual({ success: true });
    const chain = db.delete.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(recipes.id, RECIPE_ID), eq(recipes.householdId, "household-1"))
    );
  });
});
