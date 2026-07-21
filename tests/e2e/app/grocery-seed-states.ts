// Pure builders for the named Groceries E2E seed states. No DB access — they
// return the exact grocery_lists + grocery_items rows a spec needs. Items are
// hand-built (not run through the AI pipeline) so the shoppable-list mechanics —
// merge dot, one-zone check-off, quick-add/dedupe, reorder — are deterministic.
//
// sourceRecipeId is left null (no recipes rows are seeded), but the `sources`
// jsonb carries recipe ids/titles as plain data — that's what drives the amber
// merge dot (sources.length > 1) and the per-meal breakdown, no join required.

export type GroceryState =
  | "GROCERY_READY" // a populated, ready list (interaction tests)
  | "GROCERY_GENERATING" // mid-generation (the generating UI stays put)
  | "GROCERY_ERROR" // a failed generation (Plan's error card + retry)
  | "GROCERY_PENDING"; // fresh pending list, no plan → auto-generates to empty-ready

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

export interface SeedGrocerySpec {
  generationStatus: "ready" | "normalizing" | "error" | "pending";
  generationError: string | null;
  organizeMode: "grouped" | "manual";
  items: SeedGroceryItem[];
}

const RECIPE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECIPE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// A small, recognizable ready list spanning several aisles, with one merged item
// (garlic, 2 sources → the amber dot + breakdown) plus single-source, staple, and
// manual items.
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

export function buildGrocerySpec(state: GroceryState): SeedGrocerySpec {
  switch (state) {
    case "GROCERY_READY":
      return { generationStatus: "ready", generationError: null, organizeMode: "grouped", items: readyItems() };
    case "GROCERY_GENERATING":
      return { generationStatus: "normalizing", generationError: null, organizeMode: "grouped", items: [] };
    case "GROCERY_ERROR":
      return {
        generationStatus: "error",
        generationError: "The chef couldn't reach the pantry.",
        organizeMode: "grouped",
        items: [],
      };
    case "GROCERY_PENDING":
      return { generationStatus: "pending", generationError: null, organizeMode: "grouped", items: [] };
  }
}
