import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { groceryRouter } from "./grocery";
import { groceryLists, groceryItems } from "@/server/db/schema";
import {
  createMockDb,
  buildCtx,
  makeUser,
  type MockDb,
  type Chain,
} from "./grocery-test-utils";

const LIST_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_A = "22222222-2222-4222-8222-222222222222";
const ITEM_B = "33333333-3333-4333-8333-333333333333";
const user = makeUser("user-1");

function authed(db: MockDb) {
  db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
}

describe("groceryRouter.setOrganizeMode", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.setOrganizeMode({ listId: LIST_ID, mode: "manual" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject an unknown mode", async () => {
    authed(db);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(
      // @ts-expect-error — exercising input validation
      caller.setOrganizeMode({ listId: LIST_ID, mode: "sideways" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("should throw NOT_FOUND when the list isn't in the caller's household", async () => {
    authed(db);
    db.__updateReturning.set(groceryLists, []);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(
      caller.setOrganizeMode({ listId: LIST_ID, mode: "manual" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should persist the organize mode scoped to the household", async () => {
    authed(db);
    const updated = { id: LIST_ID, organizeMode: "manual" };
    db.__updateReturning.set(groceryLists, [updated]);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.setOrganizeMode({ listId: LIST_ID, mode: "manual" });

    expect(result).toEqual(updated);
    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ organizeMode: "manual" })
    );
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(groceryLists.id, LIST_ID), eq(groceryLists.householdId, "household-1"))
    );
  });
});

describe("groceryRouter.reorderSections", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.reorderSections({ listId: LIST_ID, aisleOrder: ["produce"] })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject an order containing an unknown category", async () => {
    authed(db);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(
      // @ts-expect-error — exercising the category enum
      caller.reorderSections({ listId: LIST_ID, aisleOrder: ["produce", "aisle-9"] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("should persist the section order scoped to the household", async () => {
    authed(db);
    const order = ["meat", "produce", "dairy"] as const;
    db.__updateReturning.set(groceryLists, [{ id: LIST_ID, aisleOrder: order }]);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await caller.reorderSections({ listId: LIST_ID, aisleOrder: [...order] });

    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ aisleOrder: [...order] })
    );
  });
});

describe("groceryRouter.reorderItems", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.reorderItems({ listId: LIST_ID, orderedIds: [ITEM_A] })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should write position = index for each id, in one transaction, scoped to the list", async () => {
    authed(db);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.reorderItems({
      listId: LIST_ID,
      orderedIds: [ITEM_B, ITEM_A],
    });

    expect(result).toEqual({ reordered: 2 });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(2);

    const first = db.update.mock.results[0].value as Chain;
    expect(first.set).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }));
    expect(first.where).toHaveBeenCalledWith(
      and(
        eq(groceryItems.id, ITEM_B),
        eq(groceryItems.listId, LIST_ID),
        eq(groceryItems.householdId, "household-1")
      )
    );
    const second = db.update.mock.results[1].value as Chain;
    expect(second.set).toHaveBeenCalledWith(expect.objectContaining({ position: 1 }));
  });
});
