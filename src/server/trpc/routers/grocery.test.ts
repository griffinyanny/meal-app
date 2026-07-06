import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { groceryRouter } from "./grocery";
import { groceryItems } from "@/server/db/schema";
import type { Context } from "../init";

const LIST_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";

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
    groceryLists: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __updateReturning: unknown[];
  __insertReturning: unknown[];
  __deleteReturning: unknown[];
}

function createMockDb(): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const state: MockDb = {
    query: {
      householdMembers: { findFirst: vi.fn() },
      groceryLists: { findFirst: vi.fn() },
    },
    select: vi.fn(() => makeSelectChain(selectResults)),
    update: vi.fn(() => makeMutationChain(state.__updateReturning)),
    insert: vi.fn(() => makeMutationChain(state.__insertReturning)),
    delete: vi.fn(() => makeMutationChain(state.__deleteReturning)),
    __selectResults: selectResults,
    __updateReturning: [],
    __insertReturning: [],
    __deleteReturning: [],
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

describe("groceryRouter.current", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(caller.current()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.current()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should return null when the household has no grocery list yet", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.groceryLists.findFirst.mockResolvedValueOnce(undefined);

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.current();

    expect(result).toBeNull();
  });

  it("should return the household-scoped list with its items", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const list = { id: LIST_ID, householdId: "household-1", status: "shopping" };
    db.query.groceryLists.findFirst.mockResolvedValueOnce(list);
    const items = [{ id: ITEM_ID, listId: LIST_ID, name: "Milk" }];
    db.__selectResults.set(groceryItems, items);

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.current();

    expect(result).toEqual({ ...list, items });
    const chain = db.select.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(groceryItems.listId, LIST_ID), eq(groceryItems.householdId, "household-1"))
    );
  });
});

describe("groceryRouter.checkItem", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.checkItem({ itemId: ITEM_ID, isChecked: true })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.checkItem({ itemId: ITEM_ID, isChecked: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should throw NOT_FOUND when the item isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__updateReturning = [];

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.checkItem({ itemId: ITEM_ID, isChecked: true })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should mark the item checked and record who checked it, scoped to the household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    const updated = { id: ITEM_ID, isChecked: true, checkedBy: "user-1" };
    db.__updateReturning = [updated];

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.checkItem({ itemId: ITEM_ID, isChecked: true });

    expect(result).toEqual(updated);
    const chain = db.update.mock.results[0].value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isChecked: true, checkedBy: "user-1" })
    );
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(groceryItems.id, ITEM_ID), eq(groceryItems.householdId, "household-1"))
    );
  });
});

describe("groceryRouter.addItem", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.addItem({ listId: LIST_ID, name: "Milk" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.addItem({ listId: LIST_ID, name: "Milk" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("should throw NOT_FOUND when the list isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.groceryLists.findFirst.mockResolvedValueOnce(undefined);

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(
      caller.addItem({ listId: LIST_ID, name: "Milk" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should add a manually-entered item scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.query.groceryLists.findFirst.mockResolvedValueOnce({ id: LIST_ID, householdId: "household-1" });
    const item = { id: ITEM_ID, listId: LIST_ID, name: "Milk", category: "dairy" };
    db.__insertReturning = [item];

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    const result = await caller.addItem({ listId: LIST_ID, name: "Milk", category: "dairy" });

    expect(result).toEqual(item);
    const chain = db.insert.mock.results[0].value as Chain;
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        listId: LIST_ID,
        name: "Milk",
        sourceType: "manual",
      })
    );
  });
});

describe("groceryRouter.removeItem", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(caller.removeItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should reject when the user has no household membership", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.removeItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should throw NOT_FOUND when the item isn't in the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__deleteReturning = [];

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await expect(caller.removeItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should delete the item scoped to the caller's household", async () => {
    db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
    db.__deleteReturning = [{ id: ITEM_ID }];

    const caller = groceryRouter.createCaller(buildCtx(db, mockUser));
    await caller.removeItem({ itemId: ITEM_ID });

    const chain = db.delete.mock.results[0].value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(groceryItems.id, ITEM_ID), eq(groceryItems.householdId, "household-1"))
    );
  });
});
