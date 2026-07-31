// Pure builders for the named Groceries E2E seed states. No DB access — they
// return the exact grocery_lists + grocery_items rows a spec needs. Items are
// hand-built (not run through the AI pipeline) so the shoppable-list mechanics —
// merge dot, one-zone check-off, quick-add/dedupe, reorder — are deterministic.
//
// sourceRecipeId is left null (no recipes rows are seeded), but the `sources`
// jsonb carries recipe ids/titles as plain data — that's what drives the merge
// marker (sources.length > 1) and the per-meal breakdown, no join required.

export type GroceryState =
  | "GROCERY_READY" // a populated, ready list (interaction tests)
  | "GROCERY_ALL_CHECKED" // GROCERY_READY with every item already checked → the
  // quiet completion banner. Seeded rather than driven by clicking each row: a
  // check moves its row into the GOT IT zone, so a click loop races its own
  // re-render (it timed out on the first attempt, S52).
  | "GROCERY_GENERATING" // mid-generation (the generating UI stays put)
  | "GROCERY_ERROR" // a failed generation (Plan's error card + retry)
  | "GROCERY_PENDING" // fresh pending list, no plan → auto-generates to empty-ready
  | "GROCERY_PENDING_CACHED" // GR-L1: pending list + a plan whose recipes are all
  // ready AND carry their review-time normalize cache → confirm makes zero AI
  // calls and lands on the merged list fast (the BUG-004 win).
  | "GROCERY_HYDRATING_STRAGGLERS"; // GR-L2: a list mid-generation (hydrating) whose
// plan still has unready recipes → the honest "Finishing N recipes…" straggler hint.

export interface SeedGroceryItem {
  name: string;
  rawName: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  sourceType: "recipe" | "manual" | "staple";
  sources: { recipeId: string; recipeTitle: string; qty: string; unit: string }[];
  isChecked: boolean;
  position: number;
}

export interface SeedStaple {
  name: string;
  category: string;
  isActive: boolean;
}

// A recipe to seed alongside the list, linked to a plan slot. `normalizedIngredients`
// (when present) is the review-time cache the confirm-time generate reads instead of
// calling the AI — it must align 1:1 with `ingredients` (BUG-004).
export interface SeedGroceryRecipe {
  id: string;
  title: string;
  ingredients: { qty: string; unit: string; item: string }[];
  normalizedIngredients:
    | {
        index: number;
        canonicalName: string;
        category: string;
        canonicalUnit: string;
        numericQty: number | null;
        confidence: number;
      }[]
    | null;
}

// A plan slot to seed. `recipeId`+`recipeStatus: "ready"` = a hydrated slot; a
// `null` recipe with `recipeStatus: "none"` = an unready straggler (drives the
// "Finishing N recipes…" count).
export interface SeedGrocerySlot {
  title: string;
  slotType: "recipe" | "leftover" | "eating_out" | "skip";
  recipeId: string | null;
  recipeStatus: "none" | "hydrating" | "ready" | "stale";
}

// When present, seedGroceryState also materializes a confirmed plan (+ its recipes
// and slots) and links the list to it via mealPlanId — so confirm-time generation
// and the straggler count have a real plan to read.
export interface SeedGroceryPlan {
  recipes: SeedGroceryRecipe[];
  slots: SeedGrocerySlot[];
}

export interface SeedGrocerySpec {
  generationStatus: "ready" | "hydrating" | "normalizing" | "error" | "pending";
  generationError: string | null;
  organizeMode: "grouped" | "manual";
  items: SeedGroceryItem[];
  staples: SeedStaple[];
  plan?: SeedGroceryPlan;
}

const RECIPE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECIPE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// A small, recognizable ready list spanning several aisles, with one merged item
// (garlic, 2 sources → the "2 dinners" merge marker + breakdown) plus
// single-source, staple, and manual items.
function readyItems(): SeedGroceryItem[] {
  return [
    {
      name: "garlic",
      rawName: "garlic",
      quantity: 6,
      unit: "clove",
      category: "produce",
      sourceType: "recipe",
      sources: [
        { recipeId: RECIPE_A, recipeTitle: "Seeded Salmon", qty: "2", unit: "cloves" },
        { recipeId: RECIPE_B, recipeTitle: "Seeded Pasta", qty: "4", unit: "cloves" },
      ],
      isChecked: false,
      position: 0,
    },
    {
      name: "lemon",
      rawName: "lemon",
      quantity: 2,
      unit: null,
      category: "produce",
      sourceType: "recipe",
      sources: [{ recipeId: RECIPE_A, recipeTitle: "Seeded Salmon", qty: "2", unit: "" }],
      isChecked: false,
      position: 1,
    },
    {
      name: "chicken thighs",
      rawName: "chicken thighs",
      quantity: 6,
      unit: null,
      category: "meat",
      sourceType: "recipe",
      sources: [{ recipeId: RECIPE_B, recipeTitle: "Seeded Pasta", qty: "6", unit: "" }],
      isChecked: false,
      position: 2,
    },
    {
      name: "butter",
      rawName: "butter",
      quantity: null,
      unit: null,
      category: "dairy",
      sourceType: "staple",
      sources: [],
      isChecked: false,
      position: 3,
    },
  ];
}

// Active staples for the chip row. "garlic" is deliberately also on the ready
// list (readyItems), so a spec can prove an already-added staple is hidden from
// the row while off-list staples ("olive oil", "eggs") show as chips.
function readyStaples(): SeedStaple[] {
  return [
    { name: "olive oil", category: "spices", isActive: true },
    { name: "eggs", category: "dairy", isActive: true },
    { name: "garlic", category: "produce", isActive: true },
  ];
}

// GR-L1 fixture: two ready recipes that share garlic, each carrying its aligned
// review-time normalize cache. At confirm, generate reads these caches (zero AI),
// merges the two garlic lines → one "garlic" row with 2 sources (the merge marker).
// numericQty is null to match what the ingredient-normalize mock stores (the
// aggregator parses the raw qty string itself) — so this cache is byte-identical
// to what cacheSlotNormalization would write under the mock.
function n(
  index: number,
  canonicalName: string,
  category: string,
  canonicalUnit: string
) {
  return { index, canonicalName, category, canonicalUnit, numericQty: null, confidence: 1 };
}

function cachedPlan(): SeedGroceryPlan {
  return {
    recipes: [
      {
        id: RECIPE_A,
        title: "Seeded Salmon",
        ingredients: [
          { qty: "2", unit: "cloves", item: "garlic" },
          { qty: "1", unit: "lb", item: "salmon" },
        ],
        normalizedIngredients: [
          n(0, "garlic", "produce", "clove"),
          n(1, "salmon", "seafood", "lb"),
        ],
      },
      {
        id: RECIPE_B,
        title: "Seeded Pasta",
        ingredients: [
          { qty: "4", unit: "cloves", item: "garlic" },
          { qty: "8", unit: "oz", item: "pasta" },
        ],
        normalizedIngredients: [
          n(0, "garlic", "produce", "clove"),
          n(1, "pasta", "pantry", "oz"),
        ],
      },
    ],
    slots: [
      { title: "Seeded Salmon", slotType: "recipe", recipeId: RECIPE_A, recipeStatus: "ready" },
      { title: "Seeded Pasta", slotType: "recipe", recipeId: RECIPE_B, recipeStatus: "ready" },
    ],
  };
}

// GR-L2 fixture: a plan with two cookable slots whose recipes haven't hydrated
// yet (recipeStatus "none"). With the list in `hydrating`, grocery.current counts
// these two → the "Finishing 2 recipes…" hint.
function stragglerPlan(): SeedGroceryPlan {
  return {
    recipes: [],
    slots: [
      { title: "Straggler One", slotType: "recipe", recipeId: null, recipeStatus: "none" },
      { title: "Straggler Two", slotType: "recipe", recipeId: null, recipeStatus: "none" },
    ],
  };
}

export function buildGrocerySpec(state: GroceryState): SeedGrocerySpec {
  switch (state) {
    case "GROCERY_READY":
      return {
        generationStatus: "ready",
        generationError: null,
        organizeMode: "grouped",
        items: readyItems(),
        staples: readyStaples(),
      };
    case "GROCERY_ALL_CHECKED":
      return {
        generationStatus: "ready",
        generationError: null,
        organizeMode: "grouped",
        items: readyItems().map((i) => ({ ...i, isChecked: true })),
        staples: readyStaples(),
      };
    case "GROCERY_GENERATING":
      return { generationStatus: "normalizing", generationError: null, organizeMode: "grouped", items: [], staples: [] };
    case "GROCERY_ERROR":
      return {
        generationStatus: "error",
        generationError: "The chef couldn't reach the pantry.",
        organizeMode: "grouped",
        items: [],
        staples: [],
      };
    case "GROCERY_PENDING":
      return { generationStatus: "pending", generationError: null, organizeMode: "grouped", items: [], staples: [] };
    case "GROCERY_PENDING_CACHED":
      return {
        generationStatus: "pending",
        generationError: null,
        organizeMode: "grouped",
        items: [],
        staples: [],
        plan: cachedPlan(),
      };
    case "GROCERY_HYDRATING_STRAGGLERS":
      return {
        generationStatus: "hydrating",
        generationError: null,
        organizeMode: "grouped",
        items: [],
        staples: [],
        plan: stragglerPlan(),
      };
  }
}
