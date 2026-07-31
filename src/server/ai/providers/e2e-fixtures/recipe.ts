// Recipe-hydration fixture for the E2E AI mock (Phase 1D).
// The doGenerate fixture for the `recipe-generate` task, reused by
// plan.hydrateSlot to turn a slot concept into a full recipe. Echoes the
// requested dish title (so specs can prove hydration linked the right slot's
// recipe) and returns the full nullable shape aiRecipeSchema expects.
import type { AIRecipe } from "../../tasks/types";

export const HYDRATED_RECIPE_STEP = "Preheat, combine, and cook until done.";

export function buildRecipeFixture(promptText: string): AIRecipe {
  const m = promptText.match(/planned dinner: "([^"]+)"/i);
  const title = (m ? m[1] : "Test Recipe").trim() || "Test Recipe";
  return {
    title,
    description: `A full test recipe for ${title.toLowerCase()}.`,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    ingredients: [
      { qty: "2", unit: "cups", item: "seasonal veg", notes: null, group: null },
      { qty: "1", unit: "tbsp", item: "olive oil", notes: null, group: null },
      { qty: "2", unit: "cloves", item: "garlic", notes: "minced", group: null },
    ],
    steps: [
      { number: 1, text: HYDRATED_RECIPE_STEP, durationMinutes: 5, timers: null },
      { number: 2, text: "Plate and serve.", durationMinutes: null, timers: null },
    ],
    tags: ["test", "weeknight"],
  };
}

// The `recipe-modify` fixture. Added in S56, when routing the modify dialog to
// the spec §09 control found that the dialog had NO E2E coverage at all and
// could not get any — the mock throws on a task it has no fixture for.
//
// It echoes BOTH halves of the prompt into the title: the original recipe's
// title and the user's modification request. A fixture that returned a fixed
// recipe would go green against a build that dropped the request on the floor,
// which is S46's prompt-blind generation fixture verbatim.
export function buildRecipeModifyFixture(promptText: string): AIRecipe {
  const request = promptText.match(/Modification request:\s*(.+)/)?.[1]?.trim() ?? "";
  const original = promptText.match(/"title":"([^"]+)"/)?.[1] ?? "Test Recipe";
  return {
    ...buildRecipeFixture(promptText),
    title: request ? `${original} (${request})` : original,
  };
}
