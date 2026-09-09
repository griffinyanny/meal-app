// The architecture question behind the grocery list, kept as a standing eval.
//
// Ingredient normalization originally ran as ONE call over the whole week (~70
// lines) at the moment the user confirmed their plan, which put a 35-40s wait on
// the critical path. The fix moved it to a per-recipe call made earlier, during
// review, so confirm becomes instant.
//
// That trade is only safe if per-recipe normalization merges as well as the batch
// did, and there is a specific reason to doubt it: a single batch call can see
// "scallions" and "green onions" in the same request and canonicalize them by
// co-occurrence. Seven separate calls cannot. Each one has to reach the same
// canonical name from the prompt rule alone.
//
// This case is expensive by nature — it runs the same week twice, both ways, in
// eight model calls — so it runs once per suite rather than repeating.
import { normalizeIngredients } from "@/server/ai/tasks/ingredient-normalize";
import {
  aggregateIngredients,
  type AggregatedItem,
  type NormalizedLine,
} from "@/server/grocery/aggregate";
import { defineEvalSuite } from "../harness/runner";
import { mustHold, reported } from "../harness/checks";
import { toNormalizedLines, toRawLines } from "../harness/adapters";
import { WEEK } from "../fixtures/week";

interface EquivalenceOutput {
  batch: AggregatedItem[];
  perRecipe: AggregatedItem[];
  differences: string[];
}

/** name|unit|quantity|category|sourceCount — everything a shopper would notice. */
const rowKey = (item: AggregatedItem) =>
  `${item.name}|${item.unit ?? ""}|${item.quantity ?? "null"}|${item.category}|${item.sources.length}`;

const synonymRows = (list: AggregatedItem[]) =>
  list.filter((item) => /scallion|green onion|spring onion/i.test(item.name));

async function bothPaths(): Promise<EquivalenceOutput> {
  // The OLD path: one call over every line in the week.
  let offset = 0;
  const allRaw = [];
  const offsets: number[] = [];
  for (const recipe of WEEK) {
    offsets.push(offset);
    allRaw.push(...toRawLines(recipe, offset));
    offset += recipe.lines.length;
  }
  const batchNormalized = await normalizeIngredients(allRaw);
  const batchLines: NormalizedLine[] = [];
  WEEK.forEach((recipe, i) => {
    batchLines.push(
      ...toNormalizedLines(
        recipe,
        batchNormalized.slice(offsets[i], offsets[i] + recipe.lines.length)
      )
    );
  });

  // The SHIPPED path: one call per recipe, indices reset, no cross-recipe context.
  const perRecipeLines: NormalizedLine[] = [];
  for (const recipe of WEEK) {
    const normalized = await normalizeIngredients(toRawLines(recipe));
    perRecipeLines.push(...toNormalizedLines(recipe, normalized));
  }

  const batch = aggregateIngredients(batchLines);
  const perRecipe = aggregateIngredients(perRecipeLines);

  const batchKeys = new Map(batch.map((i) => [i.name, rowKey(i)]));
  const perKeys = new Map(perRecipe.map((i) => [i.name, rowKey(i)]));
  const differences: string[] = [];
  for (const name of new Set([...batchKeys.keys(), ...perKeys.keys()])) {
    const b = batchKeys.get(name);
    const p = perKeys.get(name);
    if (b !== p) differences.push(`${name}: batch=[${b ?? "absent"}] per-recipe=[${p ?? "absent"}]`);
  }

  return { batch, perRecipe, differences };
}

defineEvalSuite<EquivalenceOutput>({
  task: "normalize-equivalence",
  repeat: 1,
  perRunBudgetMs: 180_000,
  summarize: (out) => ({
    batchRows: out.batch.length,
    perRecipeRows: out.perRecipe.length,
    differences: out.differences,
  }),
  cases: [
    {
      name: "per-recipe normalization merges as well as a single whole-week call",
      bucket: "regression",
      provenance:
        "The check that justified moving normalization off the confirm path. Kept as an eval because the claim depends on model behaviour, not on our code.",
      run: bothPaths,
      checks: [
        mustHold(
          "per-recipe calls reach the same canonical name the batch call does",
          (out) => {
            const names = (rows: typeof out.batch) =>
              new Set(synonymRows(rows).map((i) => i.name.toLowerCase()));
            const perRecipeNames = names(out.perRecipe);
            // The question is whether losing cross-recipe context changes the
            // NAME the model settles on. Whether those rows then merge is the
            // aggregator's job, and is graded separately below.
            return perRecipeNames.size === 1 && names(out.batch).size === 1;
          },
          (out) =>
            `batch: ${synonymRows(out.batch).map((i) => i.name).join(", ") || "none"} | ` +
            `per-recipe: ${synonymRows(out.perRecipe).map((i) => i.name).join(", ") || "none"}`
        ),
        reported(
          "the shopper sees one row for it, not two",
          (out) => synonymRows(out.perRecipe).length === 1,
          (out) =>
            `per-recipe synonym rows: ${
              synonymRows(out.perRecipe)
                .map((i) => `${i.name} ${i.quantity ?? "?"} ${i.unit ?? "(no unit)"}`)
                .join(" / ") || "none"
            }`
        ),
        reported(
          "both paths produce the same number of grocery rows",
          (out) => out.batch.length === out.perRecipe.length,
          (out) => `batch=${out.batch.length} per-recipe=${out.perRecipe.length}`
        ),
        reported(
          "every row is identical across both paths",
          (out) => out.differences.length === 0,
          (out) => out.differences.slice(0, 5).join(" | ")
        ),
        reported(
          "the shipped path is not materially worse at merging",
          (out) => out.perRecipe.length <= out.batch.length + 2,
          (out) => `batch=${out.batch.length} per-recipe=${out.perRecipe.length}`
        ),
      ],
    },
  ],
});
