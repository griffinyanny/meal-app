import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { groceryRouter } from "./grocery";
import { groceryItems } from "@/server/db/schema";
import { normalizeIngredients } from "@/server/ai/tasks/ingredient-normalize";
import {
  createMockDb,
  buildCtx,
  makeUser,
  type MockDb,
  type Chain,
} from "./grocery-test-utils";

// The AI boundary is mocked so no test reaches the network; the budget upsert in
// the aiProcedure middleware runs for real against the mock db.
vi.mock("@/server/ai/tasks/ingredient-normalize", () => ({
  normalizeIngredients: vi.fn(),
}));
const mockNormalize = vi.mocked(normalizeIngredients);

const LIST_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const user = makeUser("user-1");

function authed(db: MockDb) {
  db.query.householdMembers.findFirst.mockResolvedValueOnce({ householdId: "household-1" });
}

describe("groceryRouter.editItem", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.editItem({ itemId: ITEM_ID, name: "Garlic" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject an edit that changes nothing", async () => {
    authed(db);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(caller.editItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("should throw NOT_FOUND when the item isn't in the caller's household", async () => {
    authed(db);
    db.__updateReturning.set(groceryItems, []);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(
      caller.editItem({ itemId: ITEM_ID, name: "Garlic" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should update the name and parse a free-text quantity into quantity + unit", async () => {
    authed(db);
    const updated = { id: ITEM_ID, name: "Garlic", quantity: 2, unit: "heads" };
    db.__updateReturning.set(groceryItems, [updated]);

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.editItem({
      itemId: ITEM_ID,
      name: "Garlic",
      qtyText: "2 heads",
    });

    expect(result).toEqual(updated);
    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Garlic",
        rawName: "Garlic",
        quantity: 2,
        unit: "heads",
      })
    );
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(groceryItems.id, ITEM_ID), eq(groceryItems.householdId, "household-1"))
    );
  });

  it("should keep a unicode fraction + unit through the router (no silent under-buy)", async () => {
    authed(db);
    db.__updateReturning.set(groceryItems, [{ id: ITEM_ID }]);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await caller.editItem({ itemId: ITEM_ID, qtyText: "1½ cups" });

    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1.5, unit: "cups" })
    );
  });

  it("should store no amount when the quantity text carries no number", async () => {
    authed(db);
    db.__updateReturning.set(groceryItems, [{ id: ITEM_ID }]);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await caller.editItem({ itemId: ITEM_ID, qtyText: "as needed" });

    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: null, unit: null })
    );
  });
});

describe("groceryRouter.splitItem", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  const mergedItem = {
    id: ITEM_ID,
    listId: LIST_ID,
    householdId: "household-1",
    name: "garlic",
    rawName: "garlic",
    category: "produce",
    position: 3,
    sources: [
      { recipeId: "r1", recipeTitle: "Salmon", qty: "2", unit: "cloves" },
      { recipeId: "r2", recipeTitle: "Pasta", qty: "4", unit: "cloves" },
    ],
  };

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(caller.splitItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should throw NOT_FOUND when the item isn't in the caller's household", async () => {
    authed(db);
    db.query.groceryItems.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(caller.splitItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should no-op for a single-source item (nothing was merged)", async () => {
    authed(db);
    db.query.groceryItems.findFirst.mockResolvedValueOnce({
      ...mergedItem,
      sources: [mergedItem.sources[0]],
    });
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.splitItem({ itemId: ITEM_ID });

    expect(result).toEqual({ split: 0 });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("should break a merged item into one line per source with each source's own qty", async () => {
    authed(db);
    db.query.groceryItems.findFirst.mockResolvedValueOnce(mergedItem);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.splitItem({ itemId: ITEM_ID });

    expect(result).toEqual({ split: 2 });
    expect(db.delete).toHaveBeenCalled();
    const insertChain = db.insert.mock.results.at(-1)?.value as Chain;
    expect(insertChain.values).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "garlic",
        quantity: 2,
        unit: "cloves",
        sourceType: "recipe",
        sourceRecipeId: "r1",
        sources: [mergedItem.sources[0]],
      }),
      expect.objectContaining({
        quantity: 4,
        sourceRecipeId: "r2",
        sources: [mergedItem.sources[1]],
      }),
    ]);
  });
});

describe("groceryRouter.clearChecked", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(caller.clearChecked({ listId: LIST_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should delete only the checked items in the list and report the count", async () => {
    authed(db);
    db.__deleteReturning.set(groceryItems, [{ id: "a" }, { id: "b" }]);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.clearChecked({ listId: LIST_ID });

    expect(result).toEqual({ removed: 2 });
    const chain = db.delete.mock.results.at(-1)?.value as Chain;
    expect(chain.where).toHaveBeenCalledWith(
      and(
        eq(groceryItems.listId, LIST_ID),
        eq(groceryItems.householdId, "household-1"),
        eq(groceryItems.isChecked, true)
      )
    );
  });
});

describe("groceryRouter.tidyItem", () => {
  let db: MockDb;
  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  it("should reject an unauthenticated request", async () => {
    const caller = groceryRouter.createCaller(buildCtx(db, null));
    await expect(caller.tidyItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should throw NOT_FOUND when the item isn't in the caller's household", async () => {
    authed(db);
    db.query.groceryItems.findFirst.mockResolvedValueOnce(undefined);
    const caller = groceryRouter.createCaller(buildCtx(db, user));
    await expect(caller.tidyItem({ itemId: ITEM_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should canonicalize the name and set the category from the normalize result", async () => {
    authed(db);
    db.query.groceryItems.findFirst.mockResolvedValueOnce({
      id: ITEM_ID,
      householdId: "household-1",
      name: "paper towels",
      rawName: "paper towels",
      category: "other",
    });
    mockNormalize.mockResolvedValueOnce([
      {
        index: 0,
        canonicalName: "paper towel",
        category: "household",
        canonicalUnit: "",
        numericQty: null,
        confidence: 1,
      },
    ]);
    const updated = { id: ITEM_ID, name: "paper towel", category: "household" };
    db.__updateReturning.set(groceryItems, [updated]);

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.tidyItem({ itemId: ITEM_ID });

    expect(result).toEqual(updated);
    expect(mockNormalize).toHaveBeenCalledWith([
      { index: 0, qty: "", unit: "", item: "paper towels" },
    ]);
    const chain = db.update.mock.results.at(-1)?.value as Chain;
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "paper towel", category: "household" })
    );
  });

  it("should leave the item untouched when normalize returns nothing (non-fatal)", async () => {
    authed(db);
    const item = {
      id: ITEM_ID,
      householdId: "household-1",
      name: "quinoa",
      rawName: "quinoa",
      category: "other",
    };
    db.query.groceryItems.findFirst.mockResolvedValueOnce(item);
    mockNormalize.mockResolvedValueOnce([]);

    const caller = groceryRouter.createCaller(buildCtx(db, user));
    const result = await caller.tidyItem({ itemId: ITEM_ID });

    expect(result).toEqual(item);
    expect(db.update).not.toHaveBeenCalled();
  });
});
