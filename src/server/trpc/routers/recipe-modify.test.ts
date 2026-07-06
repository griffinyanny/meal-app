import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { recipeRouter } from "./recipe";
import { recipes, aiUsageDaily, aiMemories } from "@/server/db/schema";
import type { Context } from "../init";
import { modifyRecipe } from "@/server/ai/tasks/modify-recipe";

// Covers recipeRouter.modify. See recipe-generate.test.ts for generate /
// importUrl (split to stay under the 300-line test file limit).
//
// The AI boundary (modifyRecipe) is mocked entirely so no test can reach the
// network. getChefContext and the daily-budget upsert are real internal
// functions — driven through the mocked db instead.
vi.mock("@/server/ai/tasks/modify-recipe", () => ({
  modifyRecipe: vi.fn(),
}));

const mockModifyRecipe = vi.mocked(modifyRecipe);

type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeSelectChain(resultsByTable: Map<unknown, unknown[]>): Chain {
  let table: unknown;
  const chain = {} as Chain;
  chain.from = vi.fn((t: unknown) => {
    table = t;
    return chain;
  });
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resultsByTable.get(table) ?? []).then(resolve, reject)) as Chain["then"];
  return chain;
}

function makeInsertChain(table: unknown, returningByTable: Map<unknown, unknown[]>): Chain {
  const chain = {} as Chain;
  chain.values = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returningByTable.get(table) ?? []));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(undefined).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    recipes: { findFirst: ReturnType<typeof vi.fn> };
    userPreferences: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __insertReturning: Map<unknown, unknown[]>;
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const insertReturning = new Map<unknown, unknown[]>();
  selectResults.set(aiMemories, []);
  // See recipe-generate.test.ts: default the daily-budget upsert to
  // comfortably under the cap so unrelated tests aren't blocked by it.
  insertReturning.set(aiUsageDaily, [{ calls: 1 }]);
  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
      recipes: { findFirst: vi.fn() },
      userPreferences: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    insert: vi.fn((table: unknown) => makeInsertChain(table, insertReturning)),
    __selectResults: selectResults,
    __insertReturning: insertReturning,
  };
}

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

function makeUser(id: string): User {
  return {
    id,
    aud: "authenticated",
    email: `${id}@example.com`,
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
}

const RECIPE_ID = "11111111-1111-4111-8111-111111111111";

const originalRecipe = {
  id: RECIPE_ID,
  householdId: "household-1",
  title: "Chicken Alfredo",
  ingredients: [{ qty: "1", unit: "lb", item: "chicken" }],
  steps: [{ number: 1, text: "Cook chicken." }],
  servings: 4,
};

const modifiedAiRecipe = {
  title: "Dairy-Free Chicken Alfredo",
  description: "Creamy without the dairy",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  totalTimeMinutes: 30,
  ingredients: [{ qty: "1", unit: "lb", item: "chicken", notes: null, group: null }],
  steps: [{ number: 1, text: "Cook chicken.", durationMinutes: null, timers: null }],
  tags: ["dairy-free"],
};

describe("recipeRouter.modify", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.modify({ recipeId: RECIPE_ID, modification: "Make it dairy-free" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockModifyRecipe).not.toHaveBeenCalled();
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-forbidden")));
    await expect(
      caller.modify({ recipeId: RECIPE_ID, modification: "Make it dairy-free" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should throw NOT_FOUND when the original recipe isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.recipes.findFirst.mockResolvedValueOnce(undefined);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-1")));
    await expect(
      caller.modify({ recipeId: RECIPE_ID, modification: "Make it dairy-free" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockModifyRecipe).not.toHaveBeenCalled();
  });

  it("should save the modified recipe as a new row linked to its parent", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.recipes.findFirst.mockResolvedValueOnce(originalRecipe);
    mockModifyRecipe.mockResolvedValueOnce(modifiedAiRecipe);
    db.__insertReturning.set(recipes, [{ id: "recipe-new", title: modifiedAiRecipe.title }]);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-2")));
    const result = await caller.modify({
      recipeId: RECIPE_ID,
      modification: "Make it dairy-free",
    });

    expect(result).toEqual({ id: "recipe-new", title: modifiedAiRecipe.title });
    expect(db.query.recipes.findFirst).toHaveBeenCalledWith({
      where: and(eq(recipes.id, RECIPE_ID), eq(recipes.householdId, "household-1")),
    });
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        sourceType: "modification",
        parentRecipeId: RECIPE_ID,
      })
    );
  });

  it("should reject with TOO_MANY_REQUESTS once the household's daily AI budget is exhausted", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(aiUsageDaily, [{ calls: 151 }]);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-budget-exhausted")));
    await expect(
      caller.modify({ recipeId: RECIPE_ID, modification: "Make it dairy-free" })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mockModifyRecipe).not.toHaveBeenCalled();
    // The budget middleware runs before the resolver body, so the original
    // recipe should never even be looked up.
    expect(db.query.recipes.findFirst).not.toHaveBeenCalled();
  });
});
