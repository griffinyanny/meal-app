// The buy-unit table — the consolidation layer that closes BUG-002.
//
// The aggregator UNDER-merges by design: a wrong AI grouping key can only ever
// FAIL to merge two lines (a safe separate row), never wrongly merge them. That
// safety is correct, but it leaves the same shoppable item split across rows when
// a week's recipes measure it differently:
//   • a measured line + a "to taste"/no-unit line → "Salt 3.25 tsp" + "Salt"
//   • two real amounts in different units          → "Carrot 1.5 lb" + "Carrot 0.5 cup"
// Both look untidy to a shopper. This table names the canonical items where a
// shopper buys ONE thing regardless of how recipes measure it, and says how to
// present that single row.
//
// Safety is preserved. The table only ever INCREASES merging for a hand-picked set
// of canonical names, and can never merge two DIFFERENT items — the lookup key is
// the AI's own canonicalName, so a wrong/unexpected name simply misses the table
// and keeps the strict under-merge behavior. Items not in the table are unchanged.
// Worst case of a table miss is the status quo (a duplicate row), never a bad merge.
import { roundQty } from "./quantity-parse";

export type BuyUnit =
  // Buy-once item (salt, oils, dried spices): the measured qty is shopping noise —
  // you grab the container — so all lines collapse to a single UNQUANTIFIED row.
  | { kind: "staple" }
  // A natural shopping unit (carrots by the lb, onions by count): all lines collapse
  // to one row shown in this unit. Amounts already in the unit sum; amounts in OTHER
  // units fold into the same row but are NOT converted (no fake lb↔cup arithmetic).
  | { kind: "unit"; unit: string };

// Canonical names (as produced by ingredient-normalize — singular, lowercase, no
// brand/prep) that collapse to a single unquantified row. Keep to items where the
// measured amount genuinely doesn't drive the shopping decision. Bulk pantry goods
// whose amount DOES matter (flour, sugar, rice) are deliberately absent.
const STAPLES: ReadonlySet<string> = new Set([
  // salt & pepper
  "salt", "kosher salt", "sea salt", "black pepper", "white pepper",
  // cooking oils / spray
  "olive oil", "extra virgin olive oil", "vegetable oil", "canola oil",
  "sesame oil", "cooking spray",
  // dried spices & herbs
  "cumin", "paprika", "smoked paprika", "oregano", "basil", "thyme", "rosemary",
  "sage", "cinnamon", "nutmeg", "clove", "cloves", "allspice", "cardamom",
  "coriander", "turmeric", "curry powder", "chili powder", "cayenne",
  "red pepper flakes", "red pepper flake", "garlic powder", "onion powder",
  "bay leaf", "italian seasoning",
  // baking staples & flavorings
  "baking soda", "baking powder", "vanilla extract",
  // vinegars & basic condiments
  "balsamic vinegar", "white vinegar", "apple cider vinegar", "rice vinegar",
  "red wine vinegar", "soy sauce",
]);

// Canonical name → the unit a shopper buys the item in. "" means bought by count
// (no unit token), matching how the aggregator renders an empty canonicalUnit.
const BUY_UNITS: ReadonlyMap<string, string> = new Map([
  ["carrot", "lb"],
  ["potato", "lb"],
  ["sweet potato", "lb"],
  ["onion", ""],
  ["red onion", ""],
  ["yellow onion", ""],
  ["tomato", ""], // cherry/roma tomatoes carry a different canonicalName → unaffected
  ["bell pepper", ""],
  ["lemon", ""],
  ["lime", ""],
]);

// Resolve a canonical item name to its buy-unit policy, or null when the item is
// not in the table (keep the aggregator's default per-(name, unit) under-merge).
export function resolveBuyUnit(canonicalName: string): BuyUnit | null {
  const name = canonicalName.trim().toLowerCase();
  if (STAPLES.has(name)) return { kind: "staple" };
  const unit = BUY_UNITS.get(name);
  if (unit !== undefined) return { kind: "unit", unit };
  return null;
}

// The unit that appears most often among a buy-unit item's amounts; ties break to
// the first unit seen. A last-resort display unit when NO amount is in the preferred
// buy-unit AND none is a plain count, so the row still shows a real number.
function modeUnit(amounts: ReadonlyArray<{ value: number; unit: string }>): string {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const a of amounts) {
    if (!counts.has(a.unit)) order.push(a.unit);
    counts.set(a.unit, (counts.get(a.unit) ?? 0) + 1);
  }
  let best = order[0] ?? "";
  let bestCount = -1;
  for (const u of order) {
    const c = counts.get(u) ?? 0;
    if (c > bestCount) {
      best = u;
      bestCount = c;
    }
  }
  return best;
}

// Compute a concrete-buy-unit item's single row from its quantified amounts. The
// display unit is the preferred buy-unit when any amount uses it; failing that a
// plain count ("") if present (the most shopper-legible unit for this count-able
// produce, so "2 carrots + 0.5 cup" shows "2", not "0.5 cup"); failing that the mode
// unit. Only amounts in the display unit are summed; off-unit amounts are absorbed
// into the row (their provenance survives in `sources`) but never force-converted.
export function finalizeBuyUnitAmount(
  amounts: ReadonlyArray<{ value: number; unit: string }>,
  preferred: string
): { quantity: number | null; unit: string | null } {
  if (amounts.length === 0) return { quantity: null, unit: null };
  const has = (u: string) => amounts.some((a) => a.unit === u);
  const displayUnit = has(preferred) ? preferred : has("") ? "" : modeUnit(amounts);
  const sum = amounts
    .filter((a) => a.unit === displayUnit)
    .reduce((acc, a) => acc + a.value, 0);
  return { quantity: roundQty(sum), unit: displayUnit.length > 0 ? displayUnit : null };
}
