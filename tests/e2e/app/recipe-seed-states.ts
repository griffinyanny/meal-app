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

export interface SeedIngredient {
  qty: string;
  unit: string;
  item: string;
  notes?: string;
}

export interface SeedStep {
  number: number;
  text: string;
  durationMinutes?: number;
}

export interface SeedRecipe {
  id: string;
  title: string;
  description: string | null;
  // ⚠️ These two exist because they did NOT, and their absence was invisible.
  // `seed.ts` hard-coded `ingredients: []` / `steps: []` for every recipe this
  // builder produced, so 100% of seeded recipes rendered BUG-038's empty
  // labelled cards — and `recipes-detail-add-to-week`, the tab's only detail
  // capture, had NEVER shown a populated recipe body. The visual gate was
  // grading the degenerate state as the canonical one. Both seeders that came
  // later (`seedPlanState`, `seedGroceryState`) already carried real
  // ingredients; this one was the outlier. Third instance of "ask what the
  // layer cannot see" (S47 sheet states, S52 grocery-complete-banner).
  ingredients: SeedIngredient[];
  steps: SeedStep[];
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

// A plausible body, so a detail capture shows the screen a real user reads.
// Deliberately varied per recipe via the title, rather than one shared constant:
// identical bodies across ten cards would make a layout that only works for one
// length look like it works for all of them.
function body(item: string, method: string): Pick<SeedRecipe, "ingredients" | "steps"> {
  return {
    ingredients: [
      { qty: "1", unit: "lb", item, notes: "patted dry" },
      { qty: "2", unit: "tbsp", item: "olive oil" },
      { qty: "3", unit: "cloves", item: "garlic", notes: "thinly sliced" },
      { qty: "1", unit: "bunch", item: "flat-leaf parsley" },
      { qty: "1/2", unit: "tsp", item: "kosher salt" },
    ],
    steps: [
      { number: 1, text: `Season the ${item} generously and let it come to room temperature.`, durationMinutes: 15 },
      { number: 2, text: `${method} until deeply coloured and cooked through.`, durationMinutes: 12 },
      { number: 3, text: "Add the garlic to the pan and cook until fragrant, stirring so it doesn't catch." },
      { number: 4, text: "Finish with the parsley, taste for salt, and serve straight from the pan." },
    ],
  };
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
    ...body("chicken thighs", "Sear skin-side down in a heavy pan"),
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
      recipe({ id: rid(1), title: "Miso-Glazed Salmon", sourceType: "url_import", isFavorite: true, tags: ["Seafood"], totalTimeMinutes: 30, servings: 2, description: "Sweet-savoury glaze, broiler finish, on the table in half an hour.", ...body("skin-on salmon fillets", "Broil 4 inches from the element") }),
      recipe({ id: rid(2), title: "Sheet-Pan Chicken Thighs", sourceType: "ai_generated", tags: ["Sheet-pan"], totalTimeMinutes: 40, servings: 4 }),
      recipe({ id: rid(3), title: "Shrimp Scampi Linguine", sourceType: "manual", isFavorite: true, tags: ["Pasta"], totalTimeMinutes: 25, servings: 3 }),
      recipe({ id: rid(4), title: "Herb Roast Chicken", sourceType: "ai_generated", lastCookedAt: isoAt(9), tags: ["Roast"], totalTimeMinutes: 90, servings: 4 }),
      recipe({ id: rid(5), title: "Weeknight Chana Masala", sourceType: "ai_generated", lastCookedAt: isoAt(3), tags: ["Vegetarian"], totalTimeMinutes: 30, servings: 4 }),
      recipe({ id: rid(6), title: "Sausage & Peppers", sourceType: "url_import", tags: ["Skillet"], totalTimeMinutes: 35, servings: 4 }),
      recipe({ id: rid(7), title: "Ribeye with Blistered Tomatoes", sourceType: "manual", tags: ["Steak"], totalTimeMinutes: 20, servings: 2 }),
      // Plan drafts — plan_generated + sourcePlanId set (ephemeral until promoted).
      recipe({ id: rid(8), title: "Gochujang-Glazed Tofu Bowls", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Bowl"], totalTimeMinutes: 35, servings: 2 }),
      recipe({ id: rid(9), title: "Lemon Orzo with Feta", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Vegetarian"], totalTimeMinutes: 25, servings: 4 }),
      // DELIBERATELY BODY-LESS, and the only one. This is the un-hydrated plan
      // draft BUG-038 names as its production repro — a title the plan created
      // before the recipe itself was generated. Keeping exactly one means the
      // empty state stays reachable and gradeable while every other capture
      // shows the populated screen. Remove the empty body and the visual gate
      // goes blind to the fallback; make them all empty and it goes blind to
      // the real one, which is the state this file was in until S53.
      recipe({ id: rid(10), title: "Chicken Katsu Bowls", sourceType: "plan_generated", sourcePlanId: PLAN_ID, tags: ["Bowl"], totalTimeMinutes: 45, servings: 2, ingredients: [], steps: [] }),
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
