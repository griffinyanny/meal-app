import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { staplesRouter } from "./staples";
import { stapleItems } from "@/server/db/schema";
import {
  createMockDb,
  buildCtx,
  makeUser,
  type MockDb,
  type Chain,
} from "./grocery-test-utils";

const STAPLE_ID = "33333333-3333-4333-8333-333333333333";
const user = makeUser("user-1");

function authed(db: MockDb) {
  db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
}

describe("staplesRouter.list", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = staplesRouter.createCaller(buildCtx(db, null));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should return the household's staples", async () => {
    authed(db);
    const rows = [{ id: STAPLE_ID, name: "milk", isActive: true }];
    db.__selectResults.set(stapleItems, rows);
    const caller = staplesRouter.createCaller(buildCtx(db, user));
    await expect(caller.list()).resolves.toEqual(rows);
  });
});

describe("staplesRouter.add", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = staplesRouter.createCaller(buildCtx(db, null));
    await expect(caller.add({ name: "Milk" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should insert a new staple when none matches by name", async () => {
    authed(db);
    db.query.stapleItems.findFirst.mockResolvedValueOnce(undefined);
    const created = { id: STAPLE_ID, name: "Olive oil", category: "spices" };
    db.__insertReturning.set(stapleItems, [created]);

    const caller = staplesRouter.createCaller(buildCtx(db, user));
    const result = await caller.add({ name: "Olive oil", category: "spices" });

    expect(result).toEqual(created);
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        name: "Olive oil",
        category: "spices",
      })
    );
  });

  it("should reactivate an existing staple instead of duplicating (case-insensitive)", async () => {
    authed(db);
    db.query.stapleItems.findFirst.mockResolvedValueOnce({
      id: STAPLE_ID,
      name: "milk",
      isActive: false,
    });
    const updated = { id: STAPLE_ID, name: "milk", isActive: true };
    db.__updateReturning.set(stapleItems, [updated]);

    const caller = staplesRouter.createCaller(buildCtx(db, user));
    const result = await caller.add({ name: "MILK", category: "dairy" });

    expect(result).toEqual(updated);
    expect(db.insert).not.toHaveBeenCalled();
    const updateChain = db.update.mock.results.at(-1)?.value as Chain;
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, category: "dairy" })
    );
  });
});

describe("staplesRouter.setActive", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = staplesRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.setActive({ id: STAPLE_ID, isActive: false })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should throw NOT_FOUND when the staple isn't in the caller's household", async () => {
    authed(db);
    db.__updateReturning.set(stapleItems, []);
    const caller = staplesRouter.createCaller(buildCtx(db, user));
    await expect(
      caller.setActive({ id: STAPLE_ID, isActive: false })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should archive a staple and scope the write to the household", async () => {
    authed(db);
    db.__updateReturning.set(stapleItems, [{ id: STAPLE_ID, isActive: false }]);
    const caller = staplesRouter.createCaller(buildCtx(db, user));
    await caller.setActive({ id: STAPLE_ID, isActive: false });

    const updateChain = db.update.mock.results.at(-1)?.value as Chain;
    expect(updateChain.where).toHaveBeenCalledWith(
      and(eq(stapleItems.id, STAPLE_ID), eq(stapleItems.householdId, "household-1"))
    );
  });
});

describe("staplesRouter.remove", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = staplesRouter.createCaller(buildCtx(db, null));
    await expect(caller.remove({ id: STAPLE_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should throw NOT_FOUND when the staple isn't in the caller's household", async () => {
    authed(db);
    db.__deleteReturning.set(stapleItems, []);
    const caller = staplesRouter.createCaller(buildCtx(db, user));
    await expect(caller.remove({ id: STAPLE_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should delete the staple and return its id", async () => {
    authed(db);
    db.__deleteReturning.set(stapleItems, [{ id: STAPLE_ID }]);
    const caller = staplesRouter.createCaller(buildCtx(db, user));
    await expect(caller.remove({ id: STAPLE_ID })).resolves.toEqual({ id: STAPLE_ID });
  });
});
