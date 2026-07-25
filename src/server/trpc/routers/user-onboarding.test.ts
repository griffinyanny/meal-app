import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { userRouter } from "./user";
import type { Context } from "../init";
import { emptyInterviewState, type InterviewState } from "@/lib/onboarding/types";

// Chainable mocks matching the shapes the two mutations use:
//   insert(t).values(v).returning(cols)   — the memory writes
//   update(t).set(v).where(w)             — the onboarding-complete flag
interface InsertChain {
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
}

interface UpdateChain {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
}

function makeInsertChain(returning: unknown[]): InsertChain {
  const chain = {} as InsertChain;
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returning));
  return chain;
}

function makeUpdateChain(): UpdateChain {
  const chain = {} as UpdateChain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => Promise.resolve([]));
  return chain;
}

interface MockDb {
  query: { householdMembers: { findFirst: ReturnType<typeof vi.fn> } };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __inserted: unknown[][];
  __updates: UpdateChain[];
}

function createMockDb(): MockDb {
  const inserted: unknown[][] = [];
  const updates: UpdateChain[] = [];

  const db: MockDb = {
    query: {
      householdMembers: {
        findFirst: vi.fn().mockResolvedValue({ householdId: "household-1" }),
      },
    },
    insert: vi.fn(() => {
      const chain = makeInsertChain([{ id: "memory-1" }]);
      chain.values.mockImplementation((rows: unknown) => {
        inserted.push(Array.isArray(rows) ? rows : [rows]);
        return chain;
      });
      return chain;
    }),
    update: vi.fn(() => {
      const chain = makeUpdateChain();
      updates.push(chain);
      return chain;
    }),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
    __inserted: inserted,
    __updates: updates,
  };

  return db;
}

const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  email: "griffin@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
};

// The patch handed to update().set(), typed at the read-back boundary (vi.fn
// mock args are intentionally loose).
function firstSetPatch(chain: UpdateChain): { onboardingCompletedAt: Date } {
  return chain.set.mock.calls[0][0] as { onboardingCompletedAt: Date };
}

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

const completedState: InterviewState = {
  ...emptyInterviewState(),
  composition: { adults: 2, children: 1, babies: 0, babyStage: null },
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  maxCookTimeWeeknight: 30,
};

describe("userRouter.finishOnboarding", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(caller.finishOnboarding({ state: completedState })).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should always write at least one memory, even for a tap-only run", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.finishOnboarding({ state: completedState });

    expect(result.memoriesWritten).toBeGreaterThanOrEqual(1);
    expect(db.__inserted[0].length).toBeGreaterThanOrEqual(1);
  });

  it("should stamp every memory as onboarding, not explicit", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: completedState });

    const rows = db.__inserted[0] as Array<{ sourceType: string; householdId: string }>;
    expect(rows.every((r) => r.sourceType === "onboarding")).toBe(true);
    expect(rows.every((r) => r.householdId === "household-1")).toBe(true);
  });

  it("should set the onboarding-complete flag", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: completedState });

    expect(db.__updates).toHaveLength(1);
    const patch = firstSetPatch(db.__updates[0]);
    expect(patch.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("should reject a household composition that exceeds the servings domain", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.finishOnboarding({
        state: {
          ...completedState,
          composition: { adults: 15, children: 10, babies: 0, babyStage: null },
        },
      })
    ).rejects.toThrow();
  });

  it("should reject an oversized deep-answer list", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.finishOnboarding({
        state: {
          ...completedState,
          deepAnswers: Array.from({ length: 20 }, () => ({
            questionId: "heat",
            dimension: "heat" as const,
            values: ["hot"],
            memory: "Likes heat.",
          })),
        },
      })
    ).rejects.toThrow();
  });
});

describe("userRouter.skipOnboarding", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(caller.skipOnboarding()).rejects.toThrow();
  });

  it("should set the same complete flag so a skipped interview never re-prompts", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.skipOnboarding();

    expect(result.skipped).toBe(true);
    const patch = firstSetPatch(db.__updates[0]);
    expect(patch.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("should not write any memories when the interview was skipped", async () => {
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.skipOnboarding();

    expect(result.memoriesWritten).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
