import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { planRouter } from "./plan";
import { mealPlans, mealPlanSlots } from "@/server/db/schema";
import type { Context } from "../init";

// Covers planRouter's non-AI procedures: current, confirm, feedback. See
// plan-modify.test.ts for planRouter.modify (the aiProcedure mutation) —
// split to stay under the 300-line test file limit.
const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const SLOT_ID = "22222222-2222-4222-8222-222222222222";

type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
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
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resultsByTable.get(table) ?? []).then(resolve, reject)) as Chain["then"];
  return chain;
}

function makeMutationChain(returning: unknown[]): Chain {
  const chain = {} as Chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returning));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(returning).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    mealPlans: { findFirst: ReturnType<typeof vi.fn> };
    mealPlanSlots: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __updateReturning: unknown[];
  __insertReturning: unknown[];
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const state: MockDb = {
    query: {
      householdMembers: { findFirst: vi.fn() },
      mealPlans: { findFirst: vi.fn() },
      mealPlanSlots: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    update: vi.fn(() => makeMutationChain(state.__updateReturning)),
    insert: vi.fn(() => makeMutationChain(state.__insertReturning)),
    __selectResults: selectResults,
    __updateReturning: [],
    __insertReturning: [],
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

describe("planRouter.current", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = planRouter.createCaller(buildCtx(db, null));
    await expect(caller.current()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.current()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should return null when the household has no plan yet", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlans.findFirst.mockResolvedValueOnce(undefined);

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.current();

    expect(result).toBeNull();
  });

  it("should return the latest household-scoped plan with its slots", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const plan = { id: PLAN_ID, householdId: "household-1", weekStart: "2026-07-06" };
    db.query.mealPlans.findFirst.mockResolvedValueOnce(plan);
    const slots = [{ id: SLOT_ID, planId: PLAN_ID, date: "2026-07-06" }];
    db.__selectResults.set(mealPlanSlots, slots);

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.current();

    expect(result).toEqual({ ...plan, slots });
    expect(db.query.mealPlans.findFirst).toHaveBeenCalledWith({
      where: eq(mealPlans.householdId, "household-1"),
      orderBy: desc(mealPlans.weekStart),
    });
    const chain = db.select.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(mealPlanSlots.planId, PLAN_ID), eq(mealPlanSlots.householdId, "household-1"))
    );
  });
});

describe("planRouter.confirm", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = planRouter.createCaller(buildCtx(db, null));
    await expect(caller.confirm({ planId: PLAN_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.confirm({ planId: PLAN_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should throw NOT_FOUND when the plan isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__updateReturning = [];

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.confirm({ planId: PLAN_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should confirm the plan scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const updated = { id: PLAN_ID, status: "confirmed" };
    db.__updateReturning = [updated];

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.confirm({ planId: PLAN_ID });

    expect(result).toEqual(updated);
    const chain = db.update.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(mealPlans.id, PLAN_ID), eq(mealPlans.householdId, "household-1"))
    );
  });
});

describe("planRouter.feedback", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = planRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.feedback({ slotId: SLOT_ID, feedback: "thumbs_up" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.feedback({ slotId: SLOT_ID, feedback: "thumbs_up" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should throw NOT_FOUND when the slot isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(undefined);

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.feedback({ slotId: SLOT_ID, feedback: "thumbs_up" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should no-op and skip the memory write when the feedback hasn't changed", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const slot = { id: SLOT_ID, householdId: "household-1", feedback: "thumbs_up", title: "Tacos" };
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(slot);

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.feedback({ slotId: SLOT_ID, feedback: "thumbs_up" });

    expect(result).toEqual(slot);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should update the slot's feedback and log a memory so the chef learns from it", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const slot = { id: SLOT_ID, householdId: "household-1", feedback: null, title: "Tacos" };
    db.query.mealPlanSlots.findFirst.mockResolvedValueOnce(slot);
    const updated = { ...slot, feedback: "thumbs_down" };
    db.__updateReturning = [updated];
    db.__insertReturning = [{ id: "mem-1", content: 'Didn\'t love "Tacos" — suggest it less often.' }];

    const caller = planRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.feedback({ slotId: SLOT_ID, feedback: "thumbs_down" });

    expect(result).toEqual(updated);
    const insertChain = db.insert.mock.results[0].value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        category: "feedback",
        sourceType: "implicit",
      })
    );
  });
});
