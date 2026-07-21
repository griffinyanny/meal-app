import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { recipeRouter } from "./recipe";
import { recipes } from "@/server/db/schema";
import type { Context } from "../init";

// Covers recipeRouter's read-only procedures: list, get, search. See
// recipe-crud.test.ts for favorite/delete and recipe-generate.test.ts /
// recipe-modify.test.ts for the aiProcedure-gated mutations (split to stay
// under the 300-line test file limit).
const RECIPE_ID = "11111111-1111-4111-8111-111111111111";

type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

function makeSelectChain(resultsByTable: Map<unknown, unknown[]>): Chain {
  let table: unknown;
  const chain = {} as Chain;
  chain.from = vi.fn((t: unknown) => {
    table = t;
    return chain;
  });
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  // Terminal for the harvest's grouped slot query (recipe.list runs the cooked
  // harvest before its own read). Resolves by the from() table, like `then`.
  chain.groupBy = vi.fn(() => Promise.resolve(resultsByTable.get(table) ?? []));
  chain.limit = vi.fn(() => chain);
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resultsByTable.get(table) ?? []).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    recipes: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
      recipes: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    __selectResults: selectResults,
  };
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

describe("recipeRouter.list", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should return recipes scoped to the caller's household, most recent first", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const rows = [{ id: "recipe-1", title: "Salmon" }];
    db.__selectResults.set(recipes, rows);

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.list();

    expect(result).toEqual({ items: rows });
    // recipe.list runs the cooked harvest (its own select) first, then the
    // library read — so the read is the last select chain.
    const chain = db.select.mock.results.at(-1)!.value as Chain;
    expect(chain.where).toHaveBeenCalledWith(eq(recipes.householdId, "household-1"));
    expect(chain.orderBy).toHaveBeenCalledWith(desc(recipes.createdAt));
    expect(chain.limit).toHaveBeenCalledWith(200);
  });
});

describe("recipeRouter.get", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(caller.get({ id: RECIPE_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.get({ id: RECIPE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should return null instead of another household's recipe", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.recipes.findFirst.mockResolvedValueOnce(undefined);

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.get({ id: RECIPE_ID });

    expect(result).toBeNull();
    expect(db.query.recipes.findFirst).toHaveBeenCalledWith({
      where: and(eq(recipes.id, RECIPE_ID), eq(recipes.householdId, "household-1")),
    });
  });

  it("should return the recipe when it belongs to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const recipe = { id: RECIPE_ID, title: "Salmon" };
    db.query.recipes.findFirst.mockResolvedValueOnce(recipe);

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.get({ id: RECIPE_ID });

    expect(result).toEqual(recipe);
  });
});

describe("recipeRouter.search", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(caller.search({ query: "salmon" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.search({ query: "salmon" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should return household-scoped matches on title or description", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const rows = [{ id: "recipe-1", title: "Salmon dinner" }];
    db.__selectResults.set(recipes, rows);

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.search({ query: "salmon" });

    expect(result).toEqual(rows);
    const chain = db.select.mock.results[0].value as Chain;
    const term = "%salmon%";
    expect(chain.where).toHaveBeenCalledWith(
      and(
        eq(recipes.householdId, "household-1"),
        or(ilike(recipes.title, term), ilike(recipes.description, term))
      )
    );
  });

  it("should escape ILIKE wildcard characters so they match literally, not as patterns", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__selectResults.set(recipes, []);

    const caller = recipeRouter.createCaller(buildCtx(db, mockUser));
    await caller.search({ query: "50%_off" });

    const chain = db.select.mock.results[0].value as Chain;
    // "%" and "_" are ILIKE wildcards — a literal search for "50%_off" must
    // escape them (\% \_) or it would match unrelated strings like "50X9off".
    const escapedTerm = "%50\\%\\_off%";
    expect(chain.where).toHaveBeenCalledWith(
      and(
        eq(recipes.householdId, "household-1"),
        or(ilike(recipes.title, escapedTerm), ilike(recipes.description, escapedTerm))
      )
    );
  });
});
