// The deterministic grocery aggregator — the correctness core of Phase 1D's
// hybrid merge. Given the plan's recipe ingredient lines already normalized by
// the AI (canonical name, category, canonical unit — see ingredient-normalize),
// this pure function does ALL the arithmetic: it parses each line's original
// quantity string itself (see quantity-parse.ts) and sums same-unit lines that
// share a canonical name.
//
// Design contract (decisions.md, 2026-07-20 / 2026-05-26 "no LLM arithmetic"):
//   - The AI's canonicalName + canonicalUnit are used ONLY as grouping keys. A
//     wrong key can at worst FAIL to merge two things (a safe under-merge); it
//     can never force an incorrect merge, because a bad key lands in a different
//     bucket and stays its own line.
//   - Under-merge: we only combine when confident. Different canonical name,
//     different unit, or a low-confidence line ⇒ separate rows. Cherry tomatoes
//     stay separate from roma tomatoes; cups stay separate from tablespoons.
//   - The AI never returns a summed total. Every number here is code-computed by
//     parsing the recipe's own quantity strings.
//   - The AI's per-line numericQty is a FALLBACK only, used for a lone line whose
//     string this parser can't read; such a line is forced solo so its uncertain
//     number is never added to another.
//   - EXCEPTION — the buy-unit table (buy-units.ts, BUG-002): for a hand-picked set
//     of canonical names a shopper buys as one thing, lines consolidate to a single
//     row (staples drop the noise quantity; concrete-unit items sum the buy-unit and
//     absorb off-unit amounts without converting). It only ever adds merging for
//     named items and can never merge two different items.
import type { GroceryCategory, GroceryItemSource } from "@/server/db/schema";
import { GROCERY_CATEGORIES } from "@/server/db/schema";
import { parseQuantity, roundQty } from "./quantity-parse";
import { resolveBuyUnit, finalizeBuyUnitAmount, type BuyUnit } from "./buy-units";

// Quantity-string parsing moved to quantity-parse.ts (keeps this file under the
// 300-line rule); re-exported here so existing callers of the aggregator's parsing
// helpers (grocery-talk, grocery-item-mutations) are unchanged.
export { parseQuantity, parseQtyText, numberFromQty, type ParsedQty } from "./quantity-parse";

// One recipe ingredient line after AI normalization, ready to aggregate.
export interface NormalizedLine {
  rawQty: string; // the recipe's own quantity string, e.g. "1 1/2", "2-3", "a pinch"
  rawUnit: string; // the recipe's own unit, e.g. "cups"
  rawItem: string; // the recipe's own item text, e.g. "olive oil"
  canonicalName: string; // AI: grouping name, e.g. "olive oil"
  canonicalUnit: string; // AI: normalized unit for grouping, e.g. "tbsp" (may be "")
  category: GroceryCategory; // AI: aisle category
  numericQty: number | null; // AI: per-line parse — fallback only, never summed with others
  confidence: number; // AI: 0..1; low-confidence lines never merge
  recipeId: string;
  recipeTitle: string;
}

// A merged shopping-list item. `sources.length > 1` is the "summed across meals"
// signal Slice C renders as the amber dot.
export interface AggregatedItem {
  name: string;
  rawName: string;
  category: GroceryCategory;
  quantity: number | null; // null ⇒ unquantified ("as needed")
  unit: string | null;
  sources: GroceryItemSource[];
}

// Below this, we don't trust the AI's canonicalization enough to let a line merge
// with anything — it stands alone (a safe under-merge).
const CONFIDENCE_THRESHOLD = 0.5;

interface LineAmount {
  value: number | null; // the number to sum, or null if it carries no amount
  soloReason: boolean; // force this line into its own group (never merge)
}

// Resolve one line's authoritative amount + whether it may merge.
function resolveLine(line: NormalizedLine): LineAmount {
  const lowConfidence = line.confidence < CONFIDENCE_THRESHOLD;
  const noName = line.canonicalName.trim().length === 0;
  const parsed = parseQuantity(line.rawQty);

  switch (parsed.kind) {
    case "exact":
      return { value: roundQty(parsed.value), soloReason: lowConfidence || noName };
    case "range":
      // A range is approximate — safe to merge (the sum just reads "verify"), but
      // still bounded by confidence/name.
      return { value: roundQty(parsed.value), soloReason: lowConfidence || noName };
    case "unquantified":
      return { value: null, soloReason: lowConfidence || noName };
    case "unparseable":
      // The parser couldn't read a real quantity. Fall back to the AI's per-line
      // number if it has one, but force the line solo so that uncertain number is
      // never added to another line's total.
      if (line.numericQty != null && Number.isFinite(line.numericQty)) {
        return { value: roundQty(line.numericQty), soloReason: true };
      }
      return { value: null, soloReason: true };
  }
}

function categoryIndex(c: GroceryCategory): number {
  const i = GROCERY_CATEGORIES.indexOf(c);
  return i < 0 ? GROCERY_CATEGORIES.length : i;
}

interface Group {
  name: string;
  rawName: string;
  category: GroceryCategory;
  unit: string | null; // the shared keyed unit (default path); ignored for buy-unit groups
  buy: BuyUnit | null; // buy-unit policy when this item is in the table (BUG-002)
  quantified: { value: number; unit: string }[]; // amounts to sum, with their unit
  hasUnquantified: boolean;
  sources: GroceryItemSource[];
}

// Finalize one group's displayed (quantity, unit) per its merge policy.
function groupAmount(g: Group): { quantity: number | null; unit: string | null } {
  if (g.buy?.kind === "staple") {
    // Buy-once: the measured quantity is shopping noise → one unquantified row.
    return { quantity: null, unit: null };
  }
  if (g.buy?.kind === "unit") {
    return finalizeBuyUnitAmount(g.quantified, g.buy.unit);
  }
  // Default path: every line shares the keyed unit, so sum them all.
  const quantity =
    g.quantified.length > 0
      ? roundQty(g.quantified.reduce((a, c) => a + c.value, 0))
      : null;
  return { quantity, unit: g.unit };
}

// Aggregate normalized recipe lines into a merged, categorized shopping list.
// Pure and deterministic: same input → same output, no clock, no randomness.
export function aggregateIngredients(lines: NormalizedLine[]): AggregatedItem[] {
  const groups = new Map<string, Group>();
  let soloCounter = 0;

  for (const line of lines) {
    const amount = resolveLine(line);
    const name = line.canonicalName.trim() || line.rawItem.trim() || "item";
    const unit = line.canonicalUnit.trim();

    // A solo line gets a unique key so it never joins anything. A buy-unit item
    // keys on its canonical name ALONE so its differently-measured lines consolidate
    // into one row. Everything else keys on (name, unit) so exact-same-unit lines
    // combine and different units stay honestly separate.
    const buy = amount.soloReason ? null : resolveBuyUnit(name);
    let key: string;
    if (amount.soloReason) {
      key = ` solo ${soloCounter++}`;
    } else if (buy) {
      key = `buy ${name.toLowerCase()}`;
    } else {
      key = `${name.toLowerCase()} ${unit.toLowerCase()}`;
    }

    let group = groups.get(key);
    if (!group) {
      group = {
        name,
        rawName: line.rawItem.trim() || name,
        category: line.category,
        unit: unit.length > 0 ? unit : null,
        buy,
        quantified: [],
        hasUnquantified: false,
        sources: [],
      };
      groups.set(key, group);
    }

    if (amount.value != null) group.quantified.push({ value: amount.value, unit: unit.toLowerCase() });
    else group.hasUnquantified = true;

    group.sources.push({
      recipeId: line.recipeId,
      recipeTitle: line.recipeTitle,
      qty: line.rawQty,
      unit: line.rawUnit,
    });
  }

  const items: AggregatedItem[] = Array.from(groups.values()).map((g) => {
    const { quantity, unit } = groupAmount(g);
    return {
      name: g.name,
      rawName: g.rawName,
      category: g.category,
      quantity,
      unit,
      sources: g.sources,
    };
  });

  // Stable order: by aisle category, then name. Slice C persists section order
  // separately; this is just a deterministic default.
  items.sort((a, b) => {
    const ci = categoryIndex(a.category) - categoryIndex(b.category);
    if (ci !== 0) return ci;
    return a.name.localeCompare(b.name);
  });

  return items;
}
