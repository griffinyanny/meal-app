// Runs both halves of the grocery-list pipeline for the normalize suites.
//
// The split under test is the architectural one: the model returns SEMANTICS
// only (what is this called, what aisle, what unit, what number was written) and
// never does arithmetic. Summing and merging is plain deterministic code in
// `aggregateIngredients`. Grading the list means running both, which is why this
// helper exists rather than the cases calling the task directly.
import {
  normalizeIngredients,
  type RawIngredientLine,
} from "@/server/ai/tasks/ingredient-normalize";
import {
  aggregateIngredients,
  type AggregatedItem,
  type NormalizedLine,
} from "@/server/grocery/aggregate";
import type { NormalizedResult } from "@/lib/normalized-ingredient";
import { toNormalizedLines, toRawLines, type FixtureRecipe } from "./adapters";

export interface NormalizeOutput {
  recipes: FixtureRecipe[];
  normalized: NormalizedResult[];
  aggregated: AggregatedItem[];
}

/** Normalize one or more fixture recipes in a single call, then aggregate deterministically. */
export async function normalizeAndAggregate(
  recipes: FixtureRecipe[]
): Promise<NormalizeOutput> {
  let offset = 0;
  const raw: RawIngredientLine[] = [];
  const offsets: number[] = [];
  for (const recipe of recipes) {
    offsets.push(offset);
    raw.push(...toRawLines(recipe, offset));
    offset += recipe.lines.length;
  }

  const normalized = await normalizeIngredients(raw);

  const lines: NormalizedLine[] = [];
  recipes.forEach((recipe, i) => {
    lines.push(
      ...toNormalizedLines(
        recipe,
        normalized.slice(offsets[i], offsets[i] + recipe.lines.length)
      )
    );
  });

  return { recipes, normalized, aggregated: aggregateIngredients(lines) };
}

export const rowsMatching = (out: NormalizeOutput, re: RegExp): AggregatedItem[] =>
  out.aggregated.filter((item) => re.test(item.name));

/** The finished list, as a shopper would read it. */
export const showList = (out: NormalizeOutput): string =>
  out.aggregated
    .map((i) => `${i.name} ${i.quantity ?? "as needed"} ${i.unit ?? ""} (${i.sources.length}x)`)
    .join("; ");
