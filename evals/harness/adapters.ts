// Joins between what an AI task returns and what the next stage consumes.
//
// The normalize task deliberately returns SEMANTICS only (canonical name, unit,
// category, a parsed quantity) and never does arithmetic; the summing and
// merging is plain deterministic code in `aggregateIngredients`. Evaluating the
// grocery list therefore means running both halves, which needs this join —
// ported from the throwaway script that first measured it.
import type { RawIngredientLine } from "@/server/ai/tasks/ingredient-normalize";
import type { NormalizedLine } from "@/server/grocery/aggregate";
import type { NormalizedResult } from "@/lib/normalized-ingredient";

export interface FixtureRecipe {
  recipeId: string;
  recipeTitle: string;
  lines: { qty: string; unit: string; item: string }[];
}

export function toRawLines(recipe: FixtureRecipe, offset = 0): RawIngredientLine[] {
  return recipe.lines.map((line, i) => ({
    index: offset + i,
    qty: line.qty,
    unit: line.unit,
    item: line.item,
  }));
}

export function toNormalizedLines(
  recipe: FixtureRecipe,
  normalized: NormalizedResult[]
): NormalizedLine[] {
  return recipe.lines.map((line, i) => {
    const n = normalized[i];
    return {
      rawQty: line.qty,
      rawUnit: line.unit,
      rawItem: line.item,
      canonicalName: n.canonicalName,
      canonicalUnit: n.canonicalUnit,
      category: n.category,
      numericQty: n.numericQty,
      confidence: n.confidence,
      recipeId: recipe.recipeId,
      recipeTitle: recipe.recipeTitle,
    };
  });
}
