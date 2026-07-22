import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { generateGroceryList } from "./grocery-generate";
import { mealPlanSlots, recipes } from "@/server/db/schema";
import type { getDb } from "@/server/db";
import { groceryRouter } from "./grocery";
import type { Context } from "../init";
import { normalizeIngredients } from "@/server/ai/tasks/ingredient-normalize";
import { hydrateSlotRecipe } from "./plan-hydrate";

// The aggregator is exercised for real (its own suite is the correctness core).
// The two boundaries — the batched AI normalize and the straggler-hydration
// sweep — are mocked so this suite focuses on the state machine: the idempotent
// CAS claim, the checkpointed phases, the transactional replace, and error.
vi.mock("@/server/ai/tasks/ingredient-normalize", async (orig) => ({
  ...(await orig<typeof import("@/server/ai/tasks/ingredient-normalize")>()),
  normalizeIngredients: vi.fn(),
}));
vi.mock("./plan-hydrate", () => ({ hydrateSlotRecipe: vi.fn() }));

const mockNormalize = vi.mocked(normalizeIngredients);
const mockHydrate = vi.mocked(hydrateSlotRecipe);

type Db = ReturnType<typeof getDb>;
const HOUSEHOLD = "household-1";
const LIST_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";

interface MockDb {
  query: { groceryLists: { findFirst: ReturnType<typeof vi.fn> } };
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __selectResults: Map<unknown, unknown[]>;
  __claimReturning: unknown[][];
  __statusWrites: Array<{ generationStatus: string; generationError: string | null }>;
  __insertedItems: unknown[];
  __deletedRecipeItems: boolean;
}

function makeSelectChain(resultsByTable: Map<unknown, unknown[]>) {
  let table: unknown;
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn((t: unknown) => { table = t; return chain; });
  chain.where = vi.fn(() => chain);
  chain.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(resultsByTable.get(table) ?? []).then(res, rej);
  return chain;
}

function createMockDb(listRow: Record<string, unknown> | undefined): MockDb {
  const selectResults = new Map<unknown, unknown[]>();
  const claimReturning: unknown[][] = [];
  const statusWrites: MockDb["__statusWrites"] = [];
  const insertedItems: unknown[] = [];
  const db: MockDb = {
    query: { groceryLists: { findFirst: vi.fn().mockResolvedValue(listRow) } },
    select: vi.fn(() => makeSelectChain(selectResults)),
    // Every db.update is a groceryLists write. The claim uses .returning(); the
    // checkpoint/error writes are awaited directly. We record the set() payload.
    update: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.set = vi.fn((payload: MockDb["__statusWrites"][number]) => {
        statusWrites.push({
          generationStatus: payload.generationStatus,
          generationError: payload.generationError ?? null,
        });
        return chain;
      });
      chain.where = vi.fn(() => chain);
      chain.returning = vi.fn(() =>
        Promise.resolve(claimReturning.length ? claimReturning.shift()! : [])
      );
      chain.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
        Promise.resolve(undefined).then(res, rej);
      return chain;
    }),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        delete: vi.fn(() => ({
          where: vi.fn(() => {
            db.__deletedRecipeItems = true;
            return Promise.resolve(undefined);
          }),
        })),
        insert: vi.fn(() => ({
          values: vi.fn((rows: unknown[]) => {
            insertedItems.push(...rows);
            return Promise.resolve(undefined);
          }),
        })),
        update: vi.fn(() => ({
          set: vi.fn((payload: MockDb["__statusWrites"][number]) => {
            statusWrites.push({
              generationStatus: payload.generationStatus,
              generationError: payload.generationError ?? null,
            });
            return { where: vi.fn(() => Promise.resolve(undefined)) };
          }),
        })),
      };
      return cb(tx);
    }),
    __selectResults: selectResults,
    __claimReturning: claimReturning,
    __statusWrites: statusWrites,
    __insertedItems: insertedItems,
    __deletedRecipeItems: false,
  };
  return db;
}

function draftList(overrides: Record<string, unknown> = {}) {
  return {
    id: LIST_ID,
    householdId: HOUSEHOLD,
    mealPlanId: PLAN_ID,
    status: "draft",
    generationStatus: "pending",
    generationError: null,
    ...overrides,
  };
}

function readySlot(recipeId: string) {
  return { id: `slot-${recipeId}`, slotType: "recipe", recipeStatus: "ready", recipeId };
}

function recipeRow(id: string, ingredients: Array<{ qty: string; unit: string; item: string }>) {
  return { id, title: `Recipe ${id}`, ingredients };
}

type Cache = Array<{
  index: number;
  canonicalName: string;
  category: string;
  canonicalUnit: string;
  numericQty: number | null;
  confidence: number;
}>;

// A recipe carrying its review-time normalization cache (BUG-004). Aligned 1:1 with
// ingredients ⇒ confirm reads it and skips the AI.
function cachedRecipeRow(
  id: string,
  ingredients: Array<{ qty: string; unit: string; item: string }>,
  normalizedIngredients: Cache
) {
  return { id, title: `Recipe ${id}`, ingredients, normalizedIngredients };
}

function brothCache(): Cache {
  return [{ index: 0, canonicalName: "broth", category: "pantry", canonicalUnit: "cup", numericQty: null, confidence: 1 }];
}

function seedTwoRecipesSharingBroth(db: MockDb) {
  db.__selectResults.set(mealPlanSlots, [readySlot("rec-a"), readySlot("rec-b")]);
  db.__selectResults.set(recipes, [
    recipeRow("rec-a", [{ qty: "2", unit: "cup", item: "broth" }]),
    recipeRow("rec-b", [{ qty: "1", unit: "cup", item: "broth" }]),
  ]);
  // Normalize both broth lines to the same canonical key so they merge.
  mockNormalize.mockResolvedValue([
    { index: 0, canonicalName: "broth", category: "pantry", canonicalUnit: "cup", numericQty: null, confidence: 1 },
    { index: 1, canonicalName: "broth", category: "pantry", canonicalUnit: "cup", numericQty: null, confidence: 1 },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHydrate.mockResolvedValue({ slotId: "s", recipeId: "r", recipeStatus: "ready" });
});

describe("generateGroceryList", () => {
  it("throws NOT_FOUND for a missing list", async () => {
    const db = createMockDb(undefined);
    await expect(
      generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is an idempotent no-op when the list is already ready", async () => {
    const db = createMockDb(draftList({ generationStatus: "ready" }));
    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });
    expect(res.generationStatus).toBe("ready");
    expect(db.update).not.toHaveBeenCalled();
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("skips the pipeline when another call already claimed the list", async () => {
    const db = createMockDb(draftList({ generationStatus: "normalizing" }));
    db.__claimReturning.push([]); // claim matched 0 rows
    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });
    expect(res.generationStatus).toBe("normalizing");
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("claims → normalizes → aggregates → writes recipe items → ready", async () => {
    const db = createMockDb(draftList());
    db.__claimReturning.push([{ id: LIST_ID }]); // claim wins
    seedTwoRecipesSharingBroth(db);

    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });

    expect(res).toEqual({ listId: LIST_ID, generationStatus: "ready", itemCount: 1 });
    // Checkpoints advanced through the phases and ended ready.
    expect(db.__statusWrites.map((w) => w.generationStatus)).toEqual([
      "hydrating", // the claim
      "normalizing",
      "aggregating",
      "ready",
    ]);
    // The two broth lines merged into one summed item written as sourceType recipe.
    expect(db.__insertedItems).toHaveLength(1);
    expect(db.__insertedItems[0]).toMatchObject({
      name: "broth",
      quantity: 3,
      unit: "cup",
      sourceType: "recipe",
    });
    expect(db.__deletedRecipeItems).toBe(true); // idempotent replace
  });

  it("skips the AI normalize entirely when every recipe is cached (BUG-004)", async () => {
    const db = createMockDb(draftList());
    db.__claimReturning.push([{ id: LIST_ID }]);
    db.__selectResults.set(mealPlanSlots, [readySlot("rec-a"), readySlot("rec-b")]);
    db.__selectResults.set(recipes, [
      cachedRecipeRow("rec-a", [{ qty: "2", unit: "cup", item: "broth" }], brothCache()),
      cachedRecipeRow("rec-b", [{ qty: "1", unit: "cup", item: "broth" }], brothCache()),
    ]);

    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });

    // The whole point: no AI call on the confirm path, and the "normalizing" phase
    // is skipped (hydrating → aggregating → ready).
    expect(mockNormalize).not.toHaveBeenCalled();
    expect(db.__statusWrites.map((w) => w.generationStatus)).toEqual([
      "hydrating",
      "aggregating",
      "ready",
    ]);
    // Cached keys still merge the two broth lines into one summed item.
    expect(res).toEqual({ listId: LIST_ID, generationStatus: "ready", itemCount: 1 });
    expect(db.__insertedItems[0]).toMatchObject({ name: "broth", quantity: 3, unit: "cup" });
  });

  it("normalizes only the cache-miss recipe and merges cached + fresh by index", async () => {
    const db = createMockDb(draftList());
    db.__claimReturning.push([{ id: LIST_ID }]);
    // rec-a is cached; rec-b (a pre-feature/straggler recipe) has no cache.
    db.__selectResults.set(mealPlanSlots, [readySlot("rec-a"), readySlot("rec-b")]);
    db.__selectResults.set(recipes, [
      cachedRecipeRow("rec-a", [{ qty: "2", unit: "cup", item: "broth" }], brothCache()),
      recipeRow("rec-b", [{ qty: "1", unit: "cup", item: "broth" }]),
    ]);
    // The residual normalize is called with ONLY the miss line, queued under its
    // global sourced index (1). We echo that index back so it aligns on merge.
    mockNormalize.mockResolvedValue([
      { index: 1, canonicalName: "broth", category: "pantry", canonicalUnit: "cup", numericQty: null, confidence: 1 },
    ]);

    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });

    // Normalize ran once, on exactly the one uncached line (index 1).
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(mockNormalize).toHaveBeenCalledWith([
      { index: 1, qty: "1", unit: "cup", item: "broth" },
    ]);
    // Cached rec-a + freshly-normalized rec-b merge into one 3-cup broth item.
    expect(res).toEqual({ listId: LIST_ID, generationStatus: "ready", itemCount: 1 });
    expect(db.__insertedItems[0]).toMatchObject({ name: "broth", quantity: 3, unit: "cup" });
  });

  it("marks the list error (with the message) when normalize fails", async () => {
    const db = createMockDb(draftList());
    db.__claimReturning.push([{ id: LIST_ID }]);
    db.__selectResults.set(mealPlanSlots, [readySlot("rec-a")]);
    db.__selectResults.set(recipes, [recipeRow("rec-a", [{ qty: "1", unit: "cup", item: "broth" }])]);
    mockNormalize.mockRejectedValue(new Error("chef is busy"));

    const res = await generateGroceryList({ db: db as unknown as Db, householdId: HOUSEHOLD, userId: "u1", listId: LIST_ID });

    expect(res.generationStatus).toBe("error");
    const last = db.__statusWrites.at(-1);
    expect(last).toEqual({ generationStatus: "error", generationError: "chef is busy" });
    expect(db.__insertedItems).toHaveLength(0);
  });
});

describe("grocery.generate (router)", () => {
  it("rejects an unauthenticated request", async () => {
    const ctx = { db: {} as Context["db"], user: null as User | null, supabase: {} as Context["supabase"] };
    const caller = groceryRouter.createCaller(ctx as Context);
    await expect(caller.generate({ listId: LIST_ID })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
