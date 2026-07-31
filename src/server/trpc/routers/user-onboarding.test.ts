import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { userRouter } from "./user";
import type { Context } from "../init";
import { emptyInterviewState } from "@/lib/onboarding/types";
import { interviewStateSchema } from "./user-onboarding";

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

// Not annotated `InterviewState` on purpose: `dietaryFramework` is a literal
// here so the crafted states below stay assignable to the mutation's input,
// which now types that field as the same enum the persist path enforces.
const completedState = {
  ...emptyInterviewState(),
  composition: { adults: 2, children: 1, babies: 0, babyStage: null },
  dietaryFramework: "pescatarian" as const,
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
    const oversized = {
      ...completedState,
      deepAnswers: Array.from({ length: 20 }, () => ({
        questionId: "heat",
        dimension: "heat" as const,
        values: ["hot"],
        memory: "Likes heat.",
      })),
    };
    await expect(caller.finishOnboarding({ state: oversized })).rejects.toThrow();
  });
});

// BUG-013 · the sentence stored under sourceType:'onboarding' is the SERVER's,
// not the caller's. Written at the ROUTER rather than against synthesize.ts,
// because the boundary an authenticated caller actually reaches is this
// mutation — a pure function is only ever as safe as what the input schema
// admits, and the schema is half the fix.
describe("userRouter.finishOnboarding · memory provenance (BUG-013)", () => {
  let db: MockDb;

  const PLANT = "PLANTED-BY-THE-CALLER";

  function writtenContent(): string[] {
    return (db.__inserted[0] as Array<{ content: string }>).map((r) => r.content);
  }

  // Case-insensitive on purpose. The first version of this helper matched
  // exactly, and `memoryForAnswer`'s proteins branch lowercases its list — so a
  // planted string DID land and the assertion walked past it. The apparatus has
  // to be able to fail.
  function anyContains(contents: string[], needle: string): boolean {
    return contents.some((c) => c.toLowerCase().includes(needle.toLowerCase()));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should ignore a client-supplied memory string and write its own sentence", async () => {
    const planted = {
      ...completedState,
      deepAnswers: [
        { questionId: "heat", dimension: "heat", values: ["hot"], memory: PLANT },
      ],
    };
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: planted });

    const contents = writtenContent();
    expect(anyContains(contents, PLANT)).toBe(false);
    expect(contents).toContain("Likes real heat; don't hold back on spice.");
  });

  // The half the tracker's recommendation would have MISSED. `memoryForAnswer`
  // falls back to the raw value when a label lookup misses, so recomputing from
  // (questionId, values) alone hands 12 x 60 chars of caller text straight into
  // the sentence — more than double the 300-char cap the filed bug had.
  it("should ignore option values the question does not offer", async () => {
    const crafted = {
      ...completedState,
      deepAnswers: [
        {
          questionId: "proteins",
          dimension: "proteins",
          values: Array.from({ length: 12 }, (_, i) => `${PLANT}-${i}`),
          memory: null,
        },
      ],
    };
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: crafted });

    expect(anyContains(writtenContent(), PLANT)).toBe(false);
  });

  it("should ignore a questionId that is not in the server's own bank", async () => {
    const crafted = {
      ...completedState,
      deepAnswers: [
        { questionId: "not_a_question", dimension: "heat", values: ["hot"], memory: PLANT },
      ],
    };
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: crafted });

    expect(anyContains(writtenContent(), PLANT)).toBe(false);
  });

  it("should keep the real answer when a crafted one sits beside it", async () => {
    const mixed = {
      ...completedState,
      deepAnswers: [
        { questionId: "shopping", dimension: "shopping", values: ["weekly"], memory: PLANT },
        { questionId: "heat", dimension: "shopping", values: [PLANT], memory: PLANT },
      ],
    };
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: mixed });

    const rows = db.__inserted[0] as Array<{ content: string; category: string }>;
    expect(anyContains(rows.map((r) => r.content), PLANT)).toBe(false);
    // Category comes from the SERVER's question table too, so a caller cannot
    // file a preference as a behavior by relabelling the dimension.
    const shopping = rows.find((r) => r.content.includes("Shops"));
    expect(shopping?.category).toBe("behavior");
  });

  // The headline memory's own raw echo: `DIET_LABEL[x] ?? x`. `dietaryFramework`
  // is a bounded string on this input while the path that PERSISTS it enforces
  // an enum, so an unlabelled framework used to land verbatim in the headline.
  it("should drop a dietary framework it has no label for rather than echo it", async () => {
    const crafted = { ...completedState, dietaryFramework: PLANT };
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.finishOnboarding({ state: crafted });

    const contents = writtenContent();
    expect(anyContains(contents, PLANT)).toBe(false);
    // The rest of the headline still lands — dropping the clause is not
    // dropping the memory.
    expect(anyContains(contents, "2 adults and 1 child")).toBe(true);
  });

  it("should strip the client's memory and dimension rather than carrying them", () => {
    const parsed = interviewStateSchema.parse({
      ...completedState,
      deepAnswers: [
        { questionId: "heat", dimension: "shopping", values: ["hot"], memory: PLANT },
      ],
    });
    expect(parsed.deepAnswers[0]).toEqual({ questionId: "heat", values: ["hot"] });
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
