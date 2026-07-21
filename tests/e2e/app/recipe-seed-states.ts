// Pure builders for the named Recipes-tab E2E seed states (Phase 1D Slice D, #14).
// No DB access — they return the exact meal_plans + recipes + meal_plan_slots
// rows a spec needs, with fixed UUIDs so cross-table links resolve without a
// round-trip. Insert order (seed.ts): plan → recipes → slots.
//
// Two concerns are covered:
//  - RECIPES_LIBRARY: the tier UI is deterministic — pre-stamped cooked recipes,
//    favorites, plain library recipes, and plan drafts hanging off a *draft* plan
//    (so the harvest, which only reads *confirmed* past slots, leaves them alone).
//  - RECIPES_COOKED_HARVEST: no lastCookedAt is seeded; a *confirmed*, past-dated
//    plan slot points at a recipe, and loading the tab must stamp it cooked +
//    graduate it out of drafts. This exercises the harvest end to end.

const PLAN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function rid(n: number): string {
  return `cccccccc-cccc-4ccc-8ccc-0000000000${String(n).padStart(2, "0")}`;
}

function daysAgoISODate(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function isoAt(daysAgo: number): string {
  // Noon-UTC of a past day — the shape the harvest writes for lastCookedAt.
  return `${daysAgoISODate(daysAgo)}T12:00:00.000Z`;
}

export type RecipeState =
  | "RECIPES_LIBRARY" // rich mix: library + favorites + pre-stamped cooked + drafts
  | "RECIPES_COOKED_HARVEST" // confirmed past slot → tab load must stamp it cooked
  | "RECIPES_EMPTY"; // first run

export interface SeedRecipe {
  id: string;
  title: string;
  description: string | null;
  sourceType:
    | "ai_generated"
    | "url_import"
    | "manual"
    | "modification"
    | "plan_generated";
  sourcePlanId: string | null;
  isFavorite: boolean;
  lastCookedAt: string | null;
  totalTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
}

export interface SeedRecipePlan {
  id: string;
  status: "draft" | "confirmed";
  weekStart: string;
}

export interface SeedRecipeSlot {
  date: string;
  recipeId: string;
}

export interface SeedRecipeSpec {
  plan: SeedRecipePlan | null;
  recipes: SeedRecipe[];
  slots: SeedRecipeSlot[];
}

function recipe(partial: Partial<SeedRecipe> & { id: string; title: string }): SeedRecipe {
  return {
    description: null,
    sourceType: "ai_generated",
    sourcePlanId: null,
    isFavorite: false,
    lastCookedAt: null,
    totalTimeMinutes: 30,
    servings: 2,
    tags: [],
    ...partial,
  };
}

function libraryState(): SeedRecipeSpec {
  return {
    // A draft plan for the drafts to hang off. Draft status → the harvest never
    // touches these, so they stay in "From your plans".
    plan: { id: PLAN_ID, status: "draft", weekStart: daysAgoISODate(-1) },
    recipes: [
      // Deliberate library — a couple favorited, two already cooked.
      recipe({ id: rid(1), title: "Miso-Glazed Salmon", sourceType: "url_import", isFavorite: true, tags: ["Seafood"], totalTimeMinutes: 30, servings: 2 }),
      recipe({ id: rid(2), title: "Sheet-Pan Chicken Thighs", sourceType: "ai_generated", tags: ["Sheet-pan"], totalTimeMinutes: 40, servings: 4 }),
      recipe({ id: rid(3), title: "Shrimp Scampi Linguine", sourceType: "manual", isFavorite: true, tags: ["Pasta"], totalTimeMinutes: 25, servings: 3 }),
      recipe({ id: rid(4), title: "Herb Roast Chicken", sourceType: "ai_generated", lastCookedAt: isoAt(9), tags: ["Roast"], totalTimeMinutes: 90, servings: 4 }),
      recipe({ id: rid(5), title: "Weeknight Chana Masala", sourceType: "ai_generated", lastCookedAt: isoAt(3), tags: ["Vegetarian"], totalTimeMinutes: 30, servings: 4 }),
      recipe({ id: rid(6), title: "Sausage & Peppers", sourceType: "url_import", tags: ["Skillet"], totalTimeMinutes: 35, servings: 4 }),
      recipe({ id: rid(7), title: "Ribeye with Blistered Tomatoes", sourceType: "manual", tags: ["Steak"], totalTimeMinutes: 20, servings: 2 }),
      // Plan drafts — plan_generated + sourcePlanId set (ephemeral until promoted).
      recipe({ id: rid(8), title: "Gochujang-Glazed Tofu Bowls", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Bowl"], totalTimeMinutes: 35, servings: 2 }),
      recipe({ id: rid(9), title: "Lemon Orzo with Feta", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Vegetarian"], totalTimeMinutes: 25, servings: 4 }),
      recipe({ id: rid(10), title: "Chicken Katsu Bowls", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Bowl"], totalTimeMinutes: 45, servings: 2 }),
    ],
    slots: [],
  };
}

// A confirmed plan whose slot is three days in the past, pointing at a recipe
// that has NO lastCookedAt yet — loading /recipes must harvest it into "cooked".
function cookedHarvestState(): SeedRecipeSpec {
  return {
    plan: { id: PLAN_ID, status: "confirmed", weekStart: daysAgoISODate(6) },
    recipes: [
      recipe({ id: rid(1), title: "Thai Basil Chicken", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Stir-fry"], totalTimeMinutes: 25, servings: 3 }),
      // A plain library recipe with no past slot — must stay OUT of the cooked tier.
      recipe({ id: rid(2), title: "Uncooked Pantry Pasta", sourceType: "manual", tags: ["Pasta"] }),
    ],
    slots: [{ date: daysAgoISODate(3), recipeId: rid(1) }],
  };
}

export function buildRecipeSpec(state: RecipeState): SeedRecipeSpec {
  switch (state) {
    case "RECIPES_LIBRARY":
      return libraryState();
    case "RECIPES_COOKED_HARVEST":
      return cookedHarvestState();
    case "RECIPES_EMPTY":
      return { plan: null, recipes: [], slots: [] };
  }
}
