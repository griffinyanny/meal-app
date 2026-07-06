import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { userRouter } from "./user";
import { users, households } from "@/server/db/schema";
import type { Context } from "../init";

// --- Minimal chainable mocks for the Drizzle calls this router makes. ---
// Both select() and insert()/update() chains are "thenable" at every step so
// `await ctx.db.insert(t).values(v)` (no `.returning()`) and
// `await ctx.db.select().from(t).where(w)` (no further calls) both resolve.
// (See user-preferences.test.ts for the sibling file covering the rest of
// this router — split to stay under the 300-line test file limit.)
type Chain = PromiseLike<unknown> & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

function makeMutationChain(
  table: unknown,
  returningByTable: Map<unknown, unknown[]>
): Chain {
  const chain = {} as Chain;
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(returningByTable.get(table) ?? []));
  chain.then = ((resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(undefined).then(resolve, reject)) as Chain["then"];
  return chain;
}

interface MockDb {
  query: {
    householdMembers: { findFirst: ReturnType<typeof vi.fn> };
  };
  insert: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __insertReturning: Map<unknown, unknown[]>;
}

function createMockDb(): MockDb {
  const insertReturning = new Map<unknown, unknown[]>();

  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
    },
    insert: vi.fn((table: unknown) => makeMutationChain(table, insertReturning)),
    transaction: vi.fn(),
    __insertReturning: insertReturning,
  };
}

const mockUser: User = {
  id: "user-1",
  aud: "authenticated",
  email: "griffin@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: "Griffin", avatar_url: null },
};

function buildCtx(db: MockDb, user: User | null): Context {
  return {
    db: db as unknown as Context["db"],
    user,
    supabase: {} as unknown as Context["supabase"],
  };
}

describe("userRouter.ensureOnboarded", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request without touching the database", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));

    await expect(caller.ensureOnboarded()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.query.householdMembers.findFirst).not.toHaveBeenCalled();
  });

  it("should create a household and membership for a first-time user", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    db.__insertReturning.set(users, [
      { id: "user-1", displayName: "Griffin", email: "griffin@example.com" },
    ]);
    db.__insertReturning.set(households, [{ id: "household-1", name: "Griffin's Kitchen" }]);
    db.transaction.mockImplementationOnce(async (cb) => {
      const tx = {
        insert: vi.fn((table: unknown) => makeMutationChain(table, db.__insertReturning)),
      };
      return cb(tx);
    });

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.ensureOnboarded();

    expect(result).toEqual({ status: "created", householdId: "household-1" });
  });

  it("should return the existing household when membership already exists", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({
      householdId: "household-existing",
    });

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.ensureOnboarded();

    expect(result).toEqual({
      status: "already_onboarded",
      householdId: "household-existing",
    });
    // No household/membership rows should be created when one already exists.
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should return the winning household when a concurrent onboarding race loses the unique-membership insert", async () => {
    // First call (pre-transaction check): no membership yet -> proceeds to try creating one.
    // Second call (inside the catch block): another request won the race and created it first.
    db.query.householdMembers.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ householdId: "household-winner" });
    db.__insertReturning.set(users, [{ id: "user-1", displayName: "Griffin" }]);
    db.transaction.mockImplementationOnce(async () => {
      throw new Error(
        'duplicate key value violates unique constraint "household_members_user_id_unique"'
      );
    });

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.ensureOnboarded();

    expect(result).toEqual({
      status: "already_onboarded",
      householdId: "household-winner",
    });
    expect(db.query.householdMembers.findFirst).toHaveBeenCalledTimes(2);
  });

  it("should rethrow the transaction error when no winning membership can be found after all", async () => {
    db.query.householdMembers.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    db.__insertReturning.set(users, [{ id: "user-1", displayName: "Griffin" }]);
    db.transaction.mockImplementationOnce(async () => {
      throw new Error("some unrelated database error");
    });

    const caller = userRouter.createCaller(buildCtx(db, mockUser));

    await expect(caller.ensureOnboarded()).rejects.toThrow(
      "some unrelated database error"
    );
  });
});
