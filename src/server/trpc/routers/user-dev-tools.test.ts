import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { userRouter } from "./user";
import type { Context } from "../init";

// The reset runs three statements inside a transaction:
//   delete(aiMemories).where(...)      — onboarding-sourced memories only
//   delete(userPreferences).where(...) — the typed answers
//   update(users).set(...).where(...)  — clearing the completed flag
interface DeleteChain {
  where: ReturnType<typeof vi.fn>;
}

interface UpdateChain {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
    users: { findFirst: ReturnType<typeof vi.fn> };
  };
  delete: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __deletes: DeleteChain[];
  __updates: UpdateChain[];
}

function createMockDb(email: string | null): MockDb {
  const deletes: DeleteChain[] = [];
  const updates: UpdateChain[] = [];

  const db: MockDb = {
    query: {
      householdMembers: {
        findFirst: vi.fn().mockResolvedValue({ householdId: "household-1" }),
      },
      users: { findFirst: vi.fn().mockResolvedValue({ id: "user-1", email }) },
    },
    delete: vi.fn(() => {
      const chain: DeleteChain = { where: vi.fn(() => Promise.resolve([])) };
      deletes.push(chain);
      return chain;
    }),
    update: vi.fn(() => {
      const chain = {} as UpdateChain;
      chain.set = vi.fn(() => chain);
      chain.where = vi.fn(() => Promise.resolve([]));
      updates.push(chain);
      return chain;
    }),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
    __deletes: deletes,
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

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

describe("userRouter dev tools", () => {
  const originalAllowlist = process.env.DEV_TOOLS_EMAILS;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.DEV_TOOLS_EMAILS = originalAllowlist;
  });

  it("should report test mode off when no allowlist is configured", async () => {
    // The default for any real deployment. An unset variable must never be read
    // as "allow everyone".
    delete process.env.DEV_TOOLS_EMAILS;
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    expect(await caller.devToolsEnabled()).toEqual({ enabled: false });
  });

  it("should report test mode off for a user who is not on the allowlist", async () => {
    process.env.DEV_TOOLS_EMAILS = "someone-else@example.com";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    expect(await caller.devToolsEnabled()).toEqual({ enabled: false });
  });

  it("should report test mode on for an allowlisted user, ignoring case", async () => {
    process.env.DEV_TOOLS_EMAILS = " GRIFFIN@example.com , other@example.com ";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    expect(await caller.devToolsEnabled()).toEqual({ enabled: true });
  });

  it("should reject an unauthenticated reset", async () => {
    process.env.DEV_TOOLS_EMAILS = "griffin@example.com";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, null));

    await expect(caller.resetOnboarding()).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("should refuse to reset for a user who is not on the allowlist", async () => {
    // The query above is advice to the client about what to render. It is not
    // authorization, so the mutation re-checks and nothing is deleted.
    process.env.DEV_TOOLS_EMAILS = "someone-else@example.com";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    await expect(caller.resetOnboarding()).rejects.toThrow(/not enabled/i);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("should clear preferences, onboarding memories, and the completed flag", async () => {
    process.env.DEV_TOOLS_EMAILS = "griffin@example.com";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    expect(await caller.resetOnboarding()).toEqual({ reset: true });
    // Two deletes: the onboarding memories and the preferences row.
    expect(db.__deletes).toHaveLength(2);
    // ...and the flag goes back to NULL, which is what "hasn't run" means.
    const patch = db.__updates[0].set.mock.calls[0][0] as {
      onboardingCompletedAt: Date | null;
    };
    expect(patch.onboardingCompletedAt).toBeNull();
  });

  it("should run the whole reset in one transaction", async () => {
    // A partial reset is the worst outcome: the flag cleared but preferences
    // left behind would drop the user into an interview that pre-answers itself.
    process.env.DEV_TOOLS_EMAILS = "griffin@example.com";
    const db = createMockDb("griffin@example.com");
    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    await caller.resetOnboarding();
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
});
