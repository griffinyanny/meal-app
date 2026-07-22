// BUG-004 real-model eval (throwaway — S28 precedent). Proves the one thing the
// deterministic mock can't: that normalizing each recipe SEPARATELY (the new
// review-time path) yields the same canonical keys + merge quality as the old
// single 70-line batch, AND captures a real before/after confirm→ready latency vs
// the 37.7s baseline.
//
// Run:  set -a; . ./.env.local; set +a; npx tsx scripts/bug004-normalize-eval.ts
// Spends real OpenAI budget (8 gpt-4.1-mini calls: 1 batch + 7 per-recipe).
import {
  normalizeIngredients,
  type RawIngredientLine,
} from "../src/server/ai/tasks/ingredient-normalize";
import {
  aggregateIngredients,
  type NormalizedLine,
  type AggregatedItem,
} from "../src/server/grocery/aggregate";
import type { NormalizedResult } from "../src/lib/normalized-ingredient";

interface EvalRecipe {
  recipeId: string;
  recipeTitle: string;
  lines: { qty: string; unit: string; item: string }[];
}

// A realistic 7-dinner week, ~70 ingredient lines, engineered so the merge is
// exercised: garlic/onion/olive oil/salt/pepper recur across recipes, and the
// scallion↔green-onion synonym appears in two different recipes — the case the
// batch could theoretically canonicalize via co-occurrence but per-recipe must
// get from the prompt rule alone (the load-bearing assumption).
const WEEK: EvalRecipe[] = [
  {
    recipeId: "r1",
    recipeTitle: "Sheet-Pan Salmon & Asparagus",
    lines: [
      { qty: "2", unit: "fillets", item: "salmon" },
      { qty: "1", unit: "lb", item: "asparagus" },
      { qty: "2", unit: "tbsp", item: "olive oil" },
      { qty: "3", unit: "cloves", item: "garlic, minced" },
      { qty: "1", unit: "", item: "lemon" },
      { qty: "1", unit: "tsp", item: "salt" },
      { qty: "1/2", unit: "tsp", item: "black pepper" },
      { qty: "2", unit: "stalks", item: "scallions, sliced" },
    ],
  },
  {
    recipeId: "r2",
    recipeTitle: "Chicken Stir-Fry",
    lines: [
      { qty: "1.5", unit: "lbs", item: "chicken thighs" },
      { qty: "3", unit: "tbsp", item: "soy sauce" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "tbsp", item: "fresh ginger, grated" },
      { qty: "1", unit: "", item: "red bell pepper" },
      { qty: "2", unit: "cups", item: "broccoli florets" },
      { qty: "3", unit: "", item: "green onions" },
      { qty: "2", unit: "tbsp", item: "vegetable oil" },
      { qty: "1", unit: "cup", item: "jasmine rice" },
    ],
  },
  {
    recipeId: "r3",
    recipeTitle: "Beef Chili",
    lines: [
      { qty: "1", unit: "lb", item: "ground beef" },
      { qty: "1", unit: "", item: "yellow onion, diced" },
      { qty: "3", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "can", item: "kidney beans" },
      { qty: "1", unit: "can", item: "diced tomatoes" },
      { qty: "2", unit: "tbsp", item: "chili powder" },
      { qty: "1", unit: "tsp", item: "cumin" },
      { qty: "1", unit: "tsp", item: "salt" },
      { qty: "1", unit: "cup", item: "beef broth" },
    ],
  },
  {
    recipeId: "r4",
    recipeTitle: "Margherita Pizza",
    lines: [
      { qty: "1", unit: "ball", item: "pizza dough" },
      { qty: "1/2", unit: "cup", item: "tomato sauce" },
      { qty: "8", unit: "oz", item: "fresh mozzarella" },
      { qty: "1/4", unit: "cup", item: "fresh basil" },
      { qty: "2", unit: "tbsp", item: "olive oil" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1/2", unit: "tsp", item: "salt" },
    ],
  },
  {
    recipeId: "r5",
    recipeTitle: "Lentil Curry",
    lines: [
      { qty: "1", unit: "cup", item: "red lentils" },
      { qty: "1", unit: "", item: "onion, chopped" },
      { qty: "3", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "tbsp", item: "ginger" },
      { qty: "1", unit: "can", item: "coconut milk" },
      { qty: "2", unit: "tbsp", item: "curry powder" },
      { qty: "1", unit: "cup", item: "spinach" },
      { qty: "2", unit: "tbsp", item: "vegetable oil" },
      { qty: "1", unit: "tsp", item: "salt" },
    ],
  },
  {
    recipeId: "r6",
    recipeTitle: "Shrimp Tacos",
    lines: [
      { qty: "1", unit: "lb", item: "shrimp, peeled" },
      { qty: "8", unit: "", item: "corn tortillas" },
      { qty: "1", unit: "", item: "avocado" },
      { qty: "1/4", unit: "cup", item: "cilantro" },
      { qty: "1", unit: "", item: "lime" },
      { qty: "2", unit: "", item: "scallions" },
      { qty: "1", unit: "tsp", item: "cumin" },
      { qty: "1", unit: "tbsp", item: "olive oil" },
    ],
  },
  {
    recipeId: "r7",
    recipeTitle: "Veggie Pasta Primavera",
    lines: [
      { qty: "12", unit: "oz", item: "penne pasta" },
      { qty: "1", unit: "", item: "zucchini" },
      { qty: "1", unit: "cup", item: "cherry tomatoes" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1/4", unit: "cup", item: "parmesan" },
      { qty: "3", unit: "tbsp", item: "olive oil" },
      { qty: "1/2", unit: "tsp", item: "black pepper" },
      { qty: "1/4", unit: "cup", item: "fresh basil" },
    ],
  },
];

function toRaw(recipe: EvalRecipe, offset: number): RawIngredientLine[] {
  return recipe.lines.map((l, i) => ({
    index: offset + i,
    qty: l.qty,
    unit: l.unit,
    item: l.item,
  }));
}

function toNormLines(
  recipe: EvalRecipe,
  normalized: NormalizedResult[]
): NormalizedLine[] {
  return recipe.lines.map((l, i) => {
    const n = normalized[i];
    return {
      rawQty: l.qty,
      rawUnit: l.unit,
      rawItem: l.item,
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

function itemKey(it: AggregatedItem): string {
  return `${it.name}|${it.unit ?? ""}|${it.quantity ?? "null"}|${it.category}|${it.sources.length}`;
}

function printList(label: string, items: AggregatedItem[]): void {
  console.log(`\n${label} (${items.length} rows):`);
  for (const it of items) {
    const qty = it.quantity == null ? "as needed" : `${it.quantity}`;
    const merged = it.sources.length > 1 ? `  ⟵ merged x${it.sources.length}` : "";
    console.log(`  ${it.category.padEnd(10)} ${it.name} — ${qty} ${it.unit ?? ""}${merged}`);
  }
}

async function main() {
  const totalLines = WEEK.reduce((a, r) => a + r.lines.length, 0);
  console.log(`BUG-004 normalize eval — ${WEEK.length} recipes, ${totalLines} ingredient lines\n`);

  // ── BEFORE: the old confirm-path batch (one call over all ~70 lines) ──────
  let offset = 0;
  const allRaw: RawIngredientLine[] = [];
  const recipeOffsets: number[] = [];
  for (const r of WEEK) {
    recipeOffsets.push(offset);
    allRaw.push(...toRaw(r, offset));
    offset += r.lines.length;
  }

  const batchStart = Date.now();
  const batchNorm = await normalizeIngredients(allRaw);
  const batchMs = Date.now() - batchStart;
  console.log(`BATCH normalize (the OLD confirm-path call): ${batchMs}ms for ${allRaw.length} lines`);

  const batchNormLines: NormalizedLine[] = [];
  WEEK.forEach((r, ri) => {
    const start = recipeOffsets[ri];
    const slice = batchNorm.slice(start, start + r.lines.length);
    batchNormLines.push(...toNormLines(r, slice));
  });
  const batchAggStart = Date.now();
  const batchList = aggregateIngredients(batchNormLines);
  const batchAggMs = Date.now() - batchAggStart;

  // ── AFTER: per-recipe normalize (the review-time path) ────────────────────
  // Each recipe normalized separately, indices reset to 0..n per recipe (as it
  // runs during review). Timed individually so we can report the per-call cost
  // (these run spread across review, off the confirm path).
  const perRecipeMs: number[] = [];
  const perRecipeNormLines: NormalizedLine[] = [];
  for (const r of WEEK) {
    const raw = r.lines.map((l, i) => ({ index: i, qty: l.qty, unit: l.unit, item: l.item }));
    const t = Date.now();
    const norm = await normalizeIngredients(raw);
    perRecipeMs.push(Date.now() - t);
    perRecipeNormLines.push(...toNormLines(r, norm));
  }
  const perRecipeAggStart = Date.now();
  const perRecipeList = aggregateIngredients(perRecipeNormLines);
  const perRecipeAggMs = Date.now() - perRecipeAggStart;

  // ── Latency framing ───────────────────────────────────────────────────────
  const maxPerRecipe = Math.max(...perRecipeMs);
  const sumPerRecipe = perRecipeMs.reduce((a, b) => a + b, 0);
  console.log(`\nPER-RECIPE normalize (the NEW review-time path):`);
  perRecipeMs.forEach((ms, i) => console.log(`  ${WEEK[i].recipeTitle}: ${ms}ms (${WEEK[i].lines.length} lines)`));
  console.log(`  slowest single recipe: ${maxPerRecipe}ms | sum of all: ${sumPerRecipe}ms`);

  console.log(`\n── CONFIRM→READY LATENCY ─────────────────────────────`);
  console.log(`  BEFORE (old): batch normalize ${batchMs}ms + aggregate ${batchAggMs}ms = ${batchMs + batchAggMs}ms on the confirm path`);
  console.log(`  AFTER (new, fully reviewed): 0 normalize calls + aggregate ${perRecipeAggMs}ms on the confirm path`);
  console.log(`  → the ~${(batchMs / 1000).toFixed(1)}s normalize is entirely OFF confirm; each recipe's ${maxPerRecipe}ms was paid during review.`);

  // ── Equivalence ────────────────────────────────────────────────────────────
  printList("BATCH list", batchList);
  printList("PER-RECIPE list", perRecipeList);

  const batchKeys = new Map(batchList.map((it) => [it.name, itemKey(it)]));
  const perKeys = new Map(perRecipeList.map((it) => [it.name, itemKey(it)]));
  const allNames = new Set([...batchKeys.keys(), ...perKeys.keys()]);

  const diffs: string[] = [];
  for (const name of allNames) {
    const b = batchKeys.get(name);
    const p = perKeys.get(name);
    if (b !== p) diffs.push(`  "${name}": batch=[${b ?? "MISSING"}] vs per-recipe=[${p ?? "MISSING"}]`);
  }

  console.log(`\n── EQUIVALENCE ───────────────────────────────────────`);
  console.log(`  BATCH rows: ${batchList.length} | PER-RECIPE rows: ${perRecipeList.length}`);
  if (diffs.length === 0) {
    console.log(`  ✅ IDENTICAL: same rows, same merges, same sums, same categories.`);
  } else {
    console.log(`  ⚠️  ${diffs.length} difference(s) (name → key = name|unit|qty|category|sourceCount):`);
    diffs.forEach((d) => console.log(d));
  }

  // Explicit synonym check: scallions (r1, r6) + green onions (r2) → do they land
  // together in BOTH paths? This is the co-occurrence assumption under test.
  const synonymRows = (list: AggregatedItem[]) =>
    list.filter((it) => /scallion|green onion|spring onion/i.test(it.name));
  console.log(`\n── SCALLION↔GREEN ONION synonym (the co-occurrence test) ──`);
  console.log(`  BATCH:      ${synonymRows(batchList).map((it) => `${it.name}(${it.sources.length}src)`).join(", ") || "none"}`);
  console.log(`  PER-RECIPE: ${synonymRows(perRecipeList).map((it) => `${it.name}(${it.sources.length}src)`).join(", ") || "none"}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
