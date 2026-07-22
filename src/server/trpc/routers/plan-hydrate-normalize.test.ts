import { describe, it, expect, vi, beforeEach } from "vitest";
import { cacheSlotNormalization } from "./plan-hydrate";
import { planRouter } from "./plan";
import type { Context } from "../init";
import type { getDb } from "@/server/db";
import { normalizeIngredients } from "@/server/ai/tasks/ingredient-normalize";

// Covers cacheSlotNormalization (plan.normalizeSlot): the review-time step that
// normalizes one hydrated slot's recipe and caches it on the recipe row so
// confirm-time grocery generation skips the ~37s batched AI call (BUG-004). The AI
// boundary is mocked; the slot/recipe reads + the write-back are driven through a
// minimal mock db. Asserts: it caches on a miss, is idempotent when already cached,
// re-normalizes on a misaligned cache, no-ops without a recipe, and is best-effort
// (a normalize failure leaves the cache untouched and never throws).
vi.mock("@/server/ai/tasks/ingredient-normalize", async (orig) => ({
  ...(await orig<typeof import("@/server/ai/tasks/ingredient-normalize")>()),
  normalizeIngredients: vi.fn(),
}));

const mockNormalize = vi.mocked(normalizeIngredients);

type Db = ReturnType<typeof getDb>;
const HOUSEHOLD = "household-1";
const SLOT_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "22222222-2222-4222-8222-222222222222";

interface Update {
  normalizedIngredients?: unknown;
  normalizedAt?: unknown;
}

function makeDb(
  slot: Record<string, unknown> | undefined,
  recipe: Record<string, unknown> | undefined
) {
  const updates: Update[] = [];
  const db = {
    query: {
      mealPlanSlots: { findFirst: vi.fn().mockResolvedValue(slot) },
      recipes: { findFirst: vi.fn().mockResolvedValue(recipe) },
    },
    update: vi.fn(() => ({
      set: vi.fn((payload: Update) => {
        updates.push(payload);
        return { where: vi.fn(() => Promise.resolve(undefined)) };
      }),
    })),
    __updates: updates,
  };
  return db;
}

function normResult(index: number, name: string) {
  return {
    index,
    canonicalName: name,
    category: "pantry" as const,
    canonicalUnit: "cup",
    numericQty: null,
    confidence: 1,
  };
}

const slot = { id: SLOT_ID, householdId: HOUSEHOLD, recipeId: RECIPE_ID };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cacheSlotNormalization", () => {
  it("normalizes and caches when the recipe has no cache yet", async () => {
    const recipe = {
      id: RECIPE_ID,
      ingredients: [
        { qty: "2", unit: "cup", item: "broth" },
        { qty: "1", unit: "clove", item: "garlic" },
      ],
      normalizedIngredients: null,
    };
    const db = makeDb(slot, recipe);
    mockNormalize.mockResolvedValueOnce([normResult(0, "broth"), normResult(1, "garlic")]);

    const res = await cacheSlotNormalization({ db: db as unknown as Db, householdId: HOUSEHOLD, slotId: SLOT_ID });

    expect(res).toEqual({ slotId: SLOT_ID, cached: true });
    // Called with the recipe's own lines, indexed 0..n-1.
    expect(mockNormalize).toHaveBeenCalledWith([
      { index: 0, qty: "2", unit: "cup", item: "broth" },
      { index: 1, qty: "1", unit: "clove", item: "garlic" },
    ]);
    // Wrote the normalization + a timestamp to the recipe row.
    expect(db.__updates).toHaveLength(1);
    expect(db.__updates[0].normalizedIngredients).toEqual([
      normResult(0, "broth"),
      normResult(1, "garlic"),
    ]);
    expect(db.__updates[0].normalizedAt).toBeInstanceOf(Date);
  });

  it("is an idempotent no-op when the recipe is already cached and aligned", async () => {
    const recipe = {
      id: RECIPE_ID,
      ingredients: [{ qty: "2", unit: "cup", item: "broth" }],
      normalizedIngredients: [normResult(0, "broth")],
    };
    const db = makeDb(slot, recipe);

    const res = await cacheSlotNormalization({ db: db as unknown as Db, householdId: HOUSEHOLD, slotId: SLOT_ID });

    expect(res).toEqual({ slotId: SLOT_ID, cached: true });
    expect(mockNormalize).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("re-normalizes when the cache length is misaligned with ingredients", async () => {
    const recipe = {
      id: RECIPE_ID,
      ingredients: [
        { qty: "2", unit: "cup", item: "broth" },
        { qty: "1", unit: "clove", item: "garlic" },
      ],
      // stale/partial cache — only one entry for two lines.
      normalizedIngredients: [normResult(0, "broth")],
    };
    const db = makeDb(slot, recipe);
    mockNormalize.mockResolvedValueOnce([normResult(0, "broth"), normResult(1, "garlic")]);

    const res = await cacheSlotNormalization({ db: db as unknown as Db, householdId: HOUSEHOLD, slotId: SLOT_ID });

    expect(res).toEqual({ slotId: SLOT_ID, cached: true });
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(db.__updates).toHaveLength(1);
  });

  it("no-ops (cached:false, no AI) when the slot has no recipe yet", async () => {
    const db = makeDb({ id: SLOT_ID, householdId: HOUSEHOLD, recipeId: null }, undefined);

    const res = await cacheSlotNormalization({ db: db as unknown as Db, householdId: HOUSEHOLD, slotId: SLOT_ID });

    expect(res).toEqual({ slotId: SLOT_ID, cached: false });
    expect(mockNormalize).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is best-effort: a normalize failure leaves the cache untouched and never throws", async () => {
    const recipe = {
      id: RECIPE_ID,
      ingredients: [{ qty: "2", unit: "cup", item: "broth" }],
      normalizedIngredients: null,
    };
    const db = makeDb(slot, recipe);
    mockNormalize.mockRejectedValueOnce(new Error("chef is busy"));

    const res = await cacheSlotNormalization({ db: db as unknown as Db, householdId: HOUSEHOLD, slotId: SLOT_ID });

    expect(res).toEqual({ slotId: SLOT_ID, cached: false });
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("plan.normalizeSlot (router)", () => {
  it("rejects an unauthenticated request", async () => {
    const ctx = { db: {} as Context["db"], user: null, supabase: {} as Context["supabase"] };
    const caller = planRouter.createCaller(ctx as Context);
    await expect(caller.normalizeSlot({ slotId: SLOT_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockNormalize).not.toHaveBeenCalled();
  });
});
