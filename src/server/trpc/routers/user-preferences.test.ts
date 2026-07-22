import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { userRouter } from "./user";
import { userPreferences, aiMemories } from "@/server/db/schema";
import type { Context } from "../init";

// Covers userRouter.preferences / updatePreferences / memories. See
// user.test.ts for ensureOnboarded and for notes on the chain-mock shape
// (split across two files to stay under the 300-line test file limit).
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
    userPreferences: { findFirst: ReturnType<typeof vi.fn> };
    users: { findFirst: ReturnType<typeof vi.fn> };
    households: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __insertReturning: Map<unknown, unknown[]>;
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const insertReturning = new Map<unknown, unknown[]>();

  return {
    query: {
      householdMembers: { findFirst: vi.fn() },
      userPreferences: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      households: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    insert: vi.fn((table: unknown) => makeMutationChain(table, insertReturning)),
    __selectResults: selectResults,
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

describe("userRouter.preferences", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(caller.preferences()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.preferences()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should return null when the user has no saved preferences yet", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.userPreferences.findFirst.mockResolvedValueOnce(undefined);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.preferences();

    expect(result).toBeNull();
  });

  it("should look up preferences scoped to the caller's own user id", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const prefsRow = { userId: "user-1", dietaryFramework: "keto" };
    db.query.userPreferences.findFirst.mockResolvedValueOnce(prefsRow);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.preferences();

    expect(result).toEqual(prefsRow);
    expect(db.query.userPreferences.findFirst).toHaveBeenCalledWith({
      where: eq(userPreferences.userId, "user-1"),
    });
  });
});

describe("userRouter.updatePreferences", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.updatePreferences({ dietaryFramework: "vegan" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.updatePreferences({ dietaryFramework: "vegan" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should upsert preferences scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__insertReturning.set(userPreferences, [
      { userId: "user-1", householdId: "household-1", dietaryFramework: "vegan" },
    ]);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.updatePreferences({ dietaryFramework: "vegan" });

    expect(result).toEqual({
      userId: "user-1",
      householdId: "household-1",
      dietaryFramework: "vegan",
    });
    const insertChain = db.insert.mock.results[0].value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", householdId: "household-1" })
    );
  });
});

describe("userRouter.memories", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(caller.memories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.memories()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should default to the 20 most recent memories scoped to the household when no input is given", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const rows = [{ id: "mem-1", content: "Likes spicy food" }];
    db.__selectResults.set(aiMemories, rows);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.memories();

    expect(result).toEqual(rows);
    const chain = db.select.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(eq(aiMemories.householdId, "household-1"));
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it("should filter by category when provided", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__selectResults.set(aiMemories, []);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.memories({ limit: 5, category: "restriction" });

    const chain = db.select.mock.results[0].value as Chain;
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(aiMemories.householdId, "household-1"), eq(aiMemories.category, "restriction"))
    );
  });

  it("should filter to active memories only when activeOnly is set (the You-tab ledger)", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__selectResults.set(aiMemories, []);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    await caller.memories({ activeOnly: true });

    const chain = db.select.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(aiMemories.householdId, "household-1"), eq(aiMemories.isActive, true))
    );
  });
});

describe("userRouter.account", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = userRouter.createCaller(buildCtx(db, null));
    await expect(caller.account()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should return display name, email, and household name", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.users.findFirst.mockResolvedValueOnce({
      displayName: "Griffin",
      email: "griffin@example.com",
    });
    db.query.households.findFirst.mockResolvedValueOnce({ name: "The Griffin household" });

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.account();

    expect(result).toEqual({
      displayName: "Griffin",
      email: "griffin@example.com",
      householdName: "The Griffin household",
    });
  });

  it("should fall back to the auth email when no user row exists", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.users.findFirst.mockResolvedValueOnce(undefined);
    db.query.households.findFirst.mockResolvedValueOnce(undefined);

    const caller = userRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.account();

    expect(result).toEqual({
      displayName: null,
      email: "griffin@example.com",
      householdName: null,
    });
  });
});
