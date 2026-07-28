import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, desc } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { planRouter } from "./plan";
import { mealPlans, mealPlanSlots, aiUsageDaily, aiMemories } from "@/server/db/schema";
import type { Context } from "../init";
import { modifyPlan } from "@/server/ai/tasks/modify-plan";

// Covers planRouter.modify — the aiProcedure mutation. See plan.test.ts for
// current/confirm/feedback (split to stay under the 300-line test file
// limit).
//
// The AI boundary (modifyPlan) is mocked entirely so no test can reach the
// network. getChefContext, validateModification, and the daily-budget
// upsert are real internal functions — driven through the mocked db and
// real inputs instead, per the project rule against mocking internal
// functions.
vi.mock("@/server/ai/tasks/modify-plan", () => ({
  modifyPlan: vi.fn(),
}));

const mockModifyPlan = vi.mocked(modifyPlan);

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
    Promise.resolve(resultsByTable.get(table) ?? []).then(resolve, reject)) as Chain["then"];
  return chain;
}

function makeMutationChain(returning: unknown[] = []): Chain {
  const chain = {} as Chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returning));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(returning).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    mealPlans: { findFirst: ReturnType<typeof vi.fn> };
    userPreferences: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __insertReturning: Map<unknown, unknown[]>;
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const insertReturning = new Map<unknown, unknown[]>();
  selectResults.set(aiMemories, []);
  insertReturning.set(aiUsageDaily, [{ calls: 1 }]);
  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
      mealPlans: { findFirst: vi.fn() },
      userPreferences: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    insert: vi.fn((table: unknown) => makeMutationChain(insertReturning.get(table) ?? [])),
    transaction: vi.fn(),
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

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const SLOT_ID = "22222222-2222-4222-8222-222222222222";
const WEEK_START = "2026-07-06";

const existingPlan = {
  id: PLAN_ID,
  householdId: "household-1",
  weekStart: WEEK_START,
  status: "draft",
};

const existingSlot = {
  id: SLOT_ID,
  householdId: "household-1",
  planId: PLAN_ID,
  date: WEEK_START,
  slotType: "recipe",
  title: "Old Tacos",
};

describe("planRouter.modify", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = planRouter.createCaller(buildCtx(db, null));
    await expect(caller.modify({ request: "Swap Monday" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockModifyPlan).not.toHaveBeenCalled();
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-forbidden")));
    await expect(caller.modify({ request: "Swap Monday" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should throw NOT_FOUND when the household has no plan to modify yet", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlans.findFirst.mockResolvedValueOnce(undefined);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-1")));
    await expect(caller.modify({ request: "Swap Monday" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mockModifyPlan).not.toHaveBeenCalled();
  });

  it("should apply the chef's changes to the household-scoped plan and return the updated slots", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlans.findFirst.mockResolvedValueOnce(existingPlan);
    db.__selectResults.set(mealPlanSlots, [existingSlot]);
    mockModifyPlan.mockResolvedValueOnce({
      chefResponse: "Sure, swapping Monday's dinner for burgers.",
      changedMeals: [
        {
          dayOffset: 0,
          slotType: "recipe",
          title: "New Burgers",
          description: "Juicy grilled burgers",
          rationale: null,
          ingredientPreview: [],
          tags: [],
          estTimeMinutes: 20,
          estCostCents: 1200,
          servings: null,
          chips: [],
        },
      ],
      removedDayOffsets: [],
    });

    let txUpdateCalled = false;
    db.transaction.mockImplementationOnce(async (cb) => {
      const tx = {
        update: vi.fn(() => {
          txUpdateCalled = true;
          return makeMutationChain();
        }),
        insert: vi.fn(() => makeMutationChain()),
      };
      return cb(tx);
    });
    const updatedSlots = [{ ...existingSlot, title: "New Burgers" }];
    db.__selectResults.set(mealPlanSlots, updatedSlots);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-2")));
    const result = await caller.modify({ request: "Swap Monday's dinner for burgers" });

    expect(result.chefResponse).toBe("Sure, swapping Monday's dinner for burgers.");
    expect(result.plan).toEqual({ ...existingPlan, slots: updatedSlots });
    // The client highlights (and scrolls to) whatever days changed — dayOffset
    // 0 maps to the plan's week start.
    expect(result.changedDates).toEqual([WEEK_START]);
    // The changed meal landed on the same date as the existing slot, so it
    // should update that row in place rather than inserting a duplicate.
    expect(txUpdateCalled).toBe(true);
    expect(db.query.mealPlans.findFirst).toHaveBeenCalledWith({
      where: eq(mealPlans.householdId, "household-1"),
      orderBy: desc(mealPlans.weekStart),
    });
  });

  it("should report removed days in changedDates so the client can surface them", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlans.findFirst.mockResolvedValueOnce(existingPlan);
    db.__selectResults.set(mealPlanSlots, [existingSlot]);
    mockModifyPlan.mockResolvedValueOnce({
      chefResponse: "Cleared Wednesday — you're eating out.",
      changedMeals: [],
      removedDayOffsets: [2],
    });
    db.transaction.mockImplementationOnce(async (cb) => {
      const tx = {
        update: vi.fn(() => makeMutationChain()),
        insert: vi.fn(() => makeMutationChain()),
      };
      return cb(tx);
    });

    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-remove")));
    const result = await caller.modify({ request: "Clear Wednesday, we're eating out" });

    // dayOffset 2 from the 2026-07-06 week start = 2026-07-08.
    expect(result.changedDates).toEqual(["2026-07-08"]);
  });

  it("should invalidate a changed slot's recipe (null recipeId + stale status) so it re-hydrates", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlans.findFirst.mockResolvedValueOnce(existingPlan);
    // A slot that already carries a hydrated recipe.
    db.__selectResults.set(mealPlanSlots, [
      { ...existingSlot, recipeId: "99999999-9999-4999-8999-999999999999", recipeStatus: "ready" },
    ]);
    mockModifyPlan.mockResolvedValueOnce({
      chefResponse: "Swapped it.",
      changedMeals: [
        {
          dayOffset: 0,
          slotType: "recipe",
          title: "New Burgers",
          description: "Juicy grilled burgers",
          rationale: null,
          ingredientPreview: [],
          tags: [],
          estTimeMinutes: 20,
          estCostCents: 1200,
          servings: null,
          chips: [],
        },
      ],
      removedDayOffsets: [],
    });

    let setPayload: Record<string, unknown> | undefined;
    db.transaction.mockImplementationOnce(async (cb) => {
      const tx = {
        update: vi.fn(() => {
          const chain = makeMutationChain();
          chain.set = vi.fn((v: Record<string, unknown>) => {
            setPayload = v;
            return chain;
          });
          return chain;
        }),
        insert: vi.fn(() => makeMutationChain()),
      };
      return cb(tx);
    });

    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-invalidate")));
    await caller.modify({ request: "Swap Monday's dinner for burgers" });

    // The changed meal must drop its now-stale recipe and be marked for re-hydration.
    // Without this the slot keeps a recipe whose title no longer matches (the latent
    // toSlotValues bug fixed for Phase 1D — decisions.md 2026-07-20).
    expect(setPayload).toBeDefined();
    expect(setPayload).toMatchObject({ recipeId: null, recipeStatus: "stale" });
  });

  it("should reject with TOO_MANY_REQUESTS once the household's daily AI budget is exhausted", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(aiUsageDaily, [{ calls: 151 }]);

    const caller = planRouter.createCaller(buildCtx(db, makeUser("user-budget-exhausted")));
    await expect(caller.modify({ request: "Swap Monday" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mockModifyPlan).not.toHaveBeenCalled();
    // The budget middleware runs before the resolver body, so the plan
    // should never even be looked up.
    expect(db.query.mealPlans.findFirst).not.toHaveBeenCalled();
  });
});
