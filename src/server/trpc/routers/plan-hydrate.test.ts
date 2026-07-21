import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { planRouter } from "./plan";
import { recipes, aiUsageDaily, aiMemories } from "@/server/db/schema";
import type { Context } from "../init";
import { generateRecipe } from "@/server/ai/tasks/generate-recipe";

// Covers plan.hydrateSlot → hydrateSlotRecipe: the idempotency, the race-safe
// CAS claim, the conditional write-back, and non-fatal generation failure — the
// correctness core of Phase 1D background hydration. The AI boundary
// (generateRecipe) is mocked so no test reaches the network; getChefContext and
// the budget middleware are real internals driven through the mocked db, per the
// project rule against mocking internal functions.
vi.mock("@/server/ai/tasks/generate-recipe", () => ({
  generateRecipe: vi.fn(),
}));

const mockGenerateRecipe = vi.mocked(generateRecipe);

type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
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
    Promise.resolve(resultsByTable.get(table) ?? []).then(
      resolve,
      reject
    )) as Chain["then"];
  return chain;
}

function makeInsertChain(
  table: unknown,
  returningByTable: Map<unknown, unknown[]>
): Chain {
  const chain = {} as Chain;
  chain.values = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() =>
    Promise.resolve(returningByTable.get(table) ?? [])
  );
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(undefined).then(resolve, reject)) as Chain["then"];
  return chain;
}

// Each hydrate call issues 1-3 UPDATEs (claim, maybe reset, maybe link). Results
// are dequeued in call order so a test can script "claim wins, link lost" etc.
function makeUpdateChain(returningQueue: unknown[][]): Chain {
  const chain = {} as Chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() =>
    Promise.resolve(returningQueue.length ? returningQueue.shift()! : [])
  );
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(undefined).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    userPreferences: { findFirst: ReturnType<typeof vi.fn> };
    mealPlanSlots: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __insertReturning: Map<unknown, unknown[]>;
  __updateReturning: unknown[][];
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const insertReturning = new Map<unknown, unknown[]>();
  const updateReturning: unknown[][] = [];
  selectResults.set(aiMemories, []); // chef context memories
  insertReturning.set(aiUsageDaily, [{ calls: 1 }]); // budget middleware, under cap
  insertReturning.set(recipes, [{ id: "recipe-1", title: "Hydrated" }]);
  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
      userPreferences: { findFirst: vi.fn() },
      mealPlanSlots: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    insert: vi.fn((table: unknown) => makeInsertChain(table, insertReturning)),
    update: vi.fn(() => makeUpdateChain(updateReturning)),
    __selectResults: selectResults,
    __insertReturning: insertReturning,
    __updateReturning: updateReturning,
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

const SLOT_ID = "11111111-1111-4111-8111-111111111111";

function cookableSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: SLOT_ID,
    householdId: "household-1",
    planId: "plan-1",
    slotType: "recipe",
    recipeId: null,
    recipeStatus: "none",
    title: "Sheet-Pan Salmon",
    description: "Weeknight salmon",
    rationale: "Quick and balanced",
    ingredientPreview: ["salmon", "lemon"],
    servings: 2,
    estTimeMinutes: 30,
    ...overrides,
  };
}

const validAiRecipe = {
  title: "Sheet-Pan Salmon",
  description: "Pan-roasted salmon",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  totalTimeMinutes: 30,
  ingredients: [
    { qty: "2", unit: "fillets", item: "salmon", notes: null, group: null },
  ],
  steps: [{ number: 1, text: "Roast.", durationMinutes: null, timers: null }],
  tags: ["seafood"],
};

describe("plan.hydrateSlot", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = planRouter.createCaller(buildCtx(db, null));
    await expect(caller.hydrateSlot({ slotId: SLOT_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });

  it("should throw NOT_FOUND when the slot doesn't exist in the household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(undefined);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    await expect(caller.hydrateSlot({ slotId: SLOT_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });

  it("should skip non-cookable slots without generating", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(
      cookableSlot({ slotType: "eating_out", recipeStatus: "none" })
    );

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    const res = await caller.hydrateSlot({ slotId: SLOT_ID });

    expect(res).toEqual({
      slotId: SLOT_ID,
      recipeId: null,
      recipeStatus: "none",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("should be an idempotent no-op when the slot is already ready", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(
      cookableSlot({ recipeStatus: "ready", recipeId: "recipe-existing" })
    );

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    const res = await caller.hydrateSlot({ slotId: SLOT_ID });

    expect(res).toEqual({
      slotId: SLOT_ID,
      recipeId: "recipe-existing",
      recipeStatus: "ready",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("should claim, generate, and link a plan_generated recipe to the slot", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(cookableSlot());
    // claim wins, then link wins.
    db.__updateReturning.push([{ id: SLOT_ID }], [{ id: SLOT_ID }]);
    mockGenerateRecipe.mockResolvedValueOnce(validAiRecipe);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    const res = await caller.hydrateSlot({ slotId: SLOT_ID });

    expect(res).toEqual({
      slotId: SLOT_ID,
      recipeId: "recipe-1",
      recipeStatus: "ready",
    });
    expect(mockGenerateRecipe).toHaveBeenCalledTimes(1);
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        sourceType: "plan_generated",
        sourcePlanId: "plan-1",
      })
    );
  });

  it("should skip generation when another walker already claimed the slot", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst
      .mockResolvedValueOnce(cookableSlot())
      // re-read after a lost claim shows it's mid-hydration elsewhere.
      .mockResolvedValueOnce(
        cookableSlot({ recipeStatus: "hydrating", recipeId: null })
      );
    db.__updateReturning.push([]); // claim matched 0 rows

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    const res = await caller.hydrateSlot({ slotId: SLOT_ID });

    expect(res).toEqual({
      slotId: SLOT_ID,
      recipeId: null,
      recipeStatus: "hydrating",
    });
    expect(mockGenerateRecipe).not.toHaveBeenCalled();
  });

  it("should return stale (not link) when a modify intervened mid-generate", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(cookableSlot());
    // claim wins, but the conditional link matches 0 rows (slot went stale).
    db.__updateReturning.push([{ id: SLOT_ID }], []);
    mockGenerateRecipe.mockResolvedValueOnce(validAiRecipe);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    const res = await caller.hydrateSlot({ slotId: SLOT_ID });

    expect(res).toEqual({
      slotId: SLOT_ID,
      recipeId: null,
      recipeStatus: "stale",
    });
  });

  it("should release the claim and rethrow when generation fails", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-1",
    });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(cookableSlot());
    db.__updateReturning.push([{ id: SLOT_ID }]); // claim wins
    mockGenerateRecipe.mockRejectedValueOnce(new Error("chef is busy"));

    const caller = planRouter.createCaller(buildCtx(db, makeUser("u1")));
    await expect(caller.hydrateSlot({ slotId: SLOT_ID })).rejects.toThrow(
      "chef is busy"
    );
    // Two updates: the claim + the release-back-to-none. No recipe inserted.
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(db.insert).not.toHaveBeenCalledWith(recipes);
  });
});
