import { describe, it, expect, vi, beforeEach } from "vitest";
import { groceryRouter } from "./grocery";
import { groceryItems } from "@/server/db/schema";
import { talkToGroceryChef } from "@/server/ai/tasks/grocery-talk";
import {
  createMockDb,
  buildCtx,
  makeUser,
  type MockDb,
  type Chain,
} from "./grocery-test-utils";

// Mock the AI boundary so no test reaches the network; the aiProcedure budget
// upsert still runs for real against the mock db.
vi.mock("@/server/ai/tasks/grocery-talk", () => ({
  talkToGroceryChef: vi.fn(),
}));
const mockTalk = vi.mocked(talkToGroceryChef);

const LIST_ID = "11111111-1111-4111-8111-111111111111";
const user = makeUser("user-1");

function authed(db: MockDb) {
  db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
}

// Two-item list the router numbers [1]=milk, [2]=eggs.
const LIST_ITEMS = [
  { id: "item-milk", name: "milk", category: "dairy", position: 0 },
  { id: "item-eggs", name: "eggs", category: "dairy", position: 1 },
];

function seedList(db: MockDb) {
  db.query.groceryLists.findFirst.mockResolvedValueOnce({
    id: LIST_ID,
    householdId: "household-1",
  });
  db.__selectResults.set(groceryItems, LIST_ITEMS);
}

describe("groceryRouter.talk", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.talk({ listId: LIST_ID, request: "add milk" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockTalk).not.toHaveBeenCalled();
  });

  it("should throw NOT_FOUND when the list isn't in the caller's household", async () => {
    authed(db);
    db.query.groceryLists.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(
      caller.talk({ listId: LIST_ID, request: "add milk" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockTalk).not.toHaveBeenCalled();
  });

  it("should number the real list for the model (never expose ids)", async () => {
    authed(db);
    seedList(db);
    mockTalk.mockResolvedValueOnce({ reply: "Nothing to do.", ops: [] });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await caller.talk({ listId: LIST_ID, request: "what's on my list?" });

    expect(mockTalk).toHaveBeenCalledWith(
      [
        { ref: 1, name: "milk", category: "dairy" },
        { ref: 2, name: "eggs", category: "dairy" },
      ],
      "what's on my list?"
    );
  });

  it("should insert an add op as a manual item, parsing its qty", async () => {
    authed(db);
    seedList(db);
    db.__insertReturning.set(groceryItems, [{ id: "new-1" }]);
    mockTalk.mockResolvedValueOnce({
      reply: "Added tortillas.",
      ops: [{ kind: "add", name: "tortillas", category: "bakery", qty: "2 packs" }],
    });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.talk({ listId: LIST_ID, request: "add tortillas" });

    expect(result).toMatchObject({ reply: "Added tortillas.", added: 1, removed: 0 });
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith([
      expect.objectContaining({
        householdId: "household-1",
        listId: LIST_ID,
        name: "tortillas",
        category: "bakery",
        quantity: 2,
        unit: "packs",
        sourceType: "manual",
      }),
    ]);
  });

  it("should resolve a remove op's ref to the real id and delete it", async () => {
    authed(db);
    seedList(db);
    db.__deleteReturning.set(groceryItems, [{ id: "item-eggs" }]);
    mockTalk.mockResolvedValueOnce({
      reply: "Removed eggs.",
      ops: [{ kind: "remove", ref: 2 }],
    });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.talk({ listId: LIST_ID, request: "remove the eggs" });

    expect(result).toMatchObject({ removed: 1, added: 0 });
    expect(db.delete).toHaveBeenCalledWith(groceryItems);
  });

  it("should IGNORE a remove op whose ref is out of range (ID-safety)", async () => {
    authed(db);
    seedList(db);
    mockTalk.mockResolvedValueOnce({
      reply: "I couldn't find that.",
      ops: [{ kind: "remove", ref: 999 }],
    });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.talk({ listId: LIST_ID, request: "remove the pancetta" });

    // A hallucinated ref maps to nothing → nothing is deleted.
    expect(result).toMatchObject({ removed: 0, added: 0 });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("should skip an add that duplicates an item already on the list", async () => {
    authed(db);
    seedList(db);
    mockTalk.mockResolvedValueOnce({
      reply: "Milk's already on there.",
      ops: [{ kind: "add", name: "Milk", category: "dairy", qty: "" }],
    });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.talk({ listId: LIST_ID, request: "add milk" });

    expect(result).toMatchObject({ added: 0 });
    // No grocery-items insert happened (the only insert is the budget upsert).
    expect(db.insert.mock.calls.every(([t]) => t !== groceryItems)).toBe(true);
  });

  it("should apply no writes for a query-only ask", async () => {
    authed(db);
    seedList(db);
    mockTalk.mockResolvedValueOnce({
      reply: "You're low on eggs and milk.",
      ops: [],
    });

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.talk({ listId: LIST_ID, request: "what am I out of?" });

    expect(result).toEqual({
      reply: "You're low on eggs and milk.",
      added: 0,
      removed: 0,
    });
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.insert.mock.calls.every(([t]) => t !== groceryItems)).toBe(true);
  });
});
