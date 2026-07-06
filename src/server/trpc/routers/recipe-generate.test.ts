import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { recipeRouter } from "./recipe";
import { recipes, aiUsageDaily, aiMemories } from "@/server/db/schema";
import type { Context } from "../init";
import { generateRecipe } from "@/server/ai/tasks/generate-recipe";
import { parseRecipeUrl, RecipeFetchError } from "@/server/ai/tasks/parse-recipe-url";

// Covers recipeRouter.generate and recipeRouter.importUrl — the two
// aiProcedure mutations that don't need an existing recipe. See
// recipe-modify.test.ts for recipeRouter.modify (needs an original-recipe
// lookup too) — split to stay under the 300-line test file limit.
//
// The AI boundary (generateRecipe / parseRecipeUrl) is mocked entirely so no
// test can reach the network. getChefContext and the daily-budget upsert are
// real internal functions — driven through the mocked db instead, per the
// project rule against mocking internal functions.
vi.mock("@/server/ai/tasks/generate-recipe", () => ({
  generateRecipe: vi.fn(),
}));
vi.mock("@/server/ai/tasks/parse-recipe-url", () => {
  class RecipeFetchError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RecipeFetchError";
    }
  }
  return { parseRecipeUrl: vi.fn(), RecipeFetchError };
});

const mockGenerateRecipe = vi.mocked(generateRecipe);
const mockParseRecipeUrl = vi.mocked(parseRecipeUrl);

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
  // Chef context needs a memories select to resolve even when the test
  // doesn't care about its contents.
  selectResults.set(aiMemories, []);
  // Every aiProcedure call consumes the daily budget middleware, which reads
  // back the post-increment count — default to comfortably under the cap so
  // tests that aren't specifically about the budget aren't blocked by it.
  insertReturning.set(aiUsageDaily, [{ calls: 1 }]);
  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
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

const validAiRecipe = {
  title: "Garlic Salmon",
  description: "Pan-seared salmon",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  totalTimeMinutes: 25,
  ingredients: [{ qty: "2", unit: "fillets", item: "salmon", notes: null, group: null }],
  steps: [{ number: 1, text: "Sear the salmon.", durationMinutes: null, timers: null }],
  tags: ["seafood"],
};

describe("recipeRouter.generate", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(caller.generate({ prompt: "Quick dinner" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-forbidden")));
    await expect(caller.generate({ prompt: "Quick dinner" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });

  it("should save the AI-generated recipe scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(recipes, [{ id: "recipe-1", title: validAiRecipe.title }]);
    mockGenerateRecipe.mockResolvedValueOnce(validAiRecipe);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-1")));
    const result = await caller.generate({ prompt: "Quick dinner" });

    expect(result).toEqual({ id: "recipe-1", title: validAiRecipe.title });
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: "household-1", sourceType: "ai_generated" })
    );
  });

  it("should reject with TOO_MANY_REQUESTS once the household's daily AI budget is exhausted", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    // consumeDailyAiBudget upserts into aiUsageDaily and reads back the
    // post-increment count — 151 means this call pushed it over the 150 cap.
    db.__insertReturning.set(aiUsageDaily, [{ calls: 151 }]);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-budget-exhausted")));
    await expect(caller.generate({ prompt: "Quick dinner" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });
});

describe("recipeRouter.importUrl", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = recipeRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.importUrl({ url: "https://example.com/recipe" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockParseRecipeUrl).not.toHaveBeenCalled();
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-forbidden-2")));
    await expect(
      caller.importUrl({ url: "https://example.com/recipe" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should save the imported recipe scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(recipes, [{ id: "recipe-2", title: validAiRecipe.title }]);
    mockParseRecipeUrl.mockResolvedValueOnce(validAiRecipe);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-2")));
    const result = await caller.importUrl({ url: "https://example.com/recipe" });

    expect(result).toEqual({ id: "recipe-2", title: validAiRecipe.title });
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        sourceType: "url_import",
        sourceUrl: "https://example.com/recipe",
      })
    );
  });

  it("should turn a RecipeFetchError into a BAD_REQUEST instead of a raw 500", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    mockParseRecipeUrl.mockRejectedValueOnce(
      new RecipeFetchError("That URL can't be imported. Try a public recipe site.")
    );

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-3")));
    await expect(
      caller.importUrl({ url: "https://example.com/recipe" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("should reject with TOO_MANY_REQUESTS once the household's daily AI budget is exhausted", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(aiUsageDaily, [{ calls: 200 }]);

    const caller = recipeRouter.createCaller(buildCtx(db, makeUser("user-budget-exhausted-2")));
    await expect(
      caller.importUrl({ url: "https://example.com/recipe" })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mockParseRecipeUrl).not.toHaveBeenCalled();
  });
});
