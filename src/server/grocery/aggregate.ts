// The deterministic grocery aggregator — the correctness core of Phase 1D's
// hybrid merge. Given the plan's recipe ingredient lines already normalized by
// the AI (canonical name, category, canonical unit — see ingredient-normalize),
// this pure function does ALL the arithmetic: it parses each line's original
// quantity string itself and sums same-unit lines that share a canonical name.
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
import type { GroceryCategory, GroceryItemSource } from "@/server/db/schema";
import { GROCERY_CATEGORIES } from "@/server/db/schema";

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

// Quantity words that carry no countable amount. These stay unquantified rather
// than being coerced to a number.
const UNQUANTIFIED_WORDS = [
  "pinch",
  "to taste",
  "as needed",
  "as desired",
  "some",
  "handful",
  "dash",
  "splash",
  "drizzle",
  "for garnish",
  "for serving",
  "optional",
];

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

export type ParsedQty =
  | { kind: "exact"; value: number }
  | { kind: "range"; value: number } // value = higher end; buy enough, don't come up short
  | { kind: "unquantified" } // empty, or a known "as needed" word
  | { kind: "unparseable" }; // non-empty, but no number this parser recognizes

// Parse a single numeric token: integer, decimal, "1/2", "1 1/2", "½", "1½".
// Returns null if the token isn't a clean number.
function parseSingleNumber(tokenRaw: string): number | null {
  let token = tokenRaw.trim();
  if (!token) return null;

  // A trailing unicode fraction ("1½", "½") contributes its decimal value.
  let unicodeVal = 0;
  const last = token[token.length - 1];
  if (UNICODE_FRACTIONS[last] != null) {
    unicodeVal = UNICODE_FRACTIONS[last];
    token = token.slice(0, -1).trim();
    if (token === "") return unicodeVal;
  }

  let m = token.match(/^(\d+)\s+(\d+)\/(\d+)$/); // mixed "1 1/2"
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]) + unicodeVal;

  m = token.match(/^(\d+)\/(\d+)$/); // fraction "1/2"
  if (m) return Number(m[1]) / Number(m[2]) + unicodeVal;

  m = token.match(/^(\d+(?:\.\d+)?)$/); // decimal / integer
  if (m) return Number(m[1]) + unicodeVal;

  return null;
}

// Parse a recipe quantity string into a countable amount (or an honest "no
// amount"). Ranges resolve to the higher end and are flagged so a merge that
// includes one reads as approximate.
export function parseQuantity(raw: string): ParsedQty {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return { kind: "unquantified" };

  // Known no-amount phrases ("a pinch", "to taste") — only when there's no leading
  // number ("1 pinch" is still a count of 1).
  const hasLeadingNumber = /^[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(s);
  if (!hasLeadingNumber && UNQUANTIFIED_WORDS.some((w) => s.includes(w))) {
    return { kind: "unquantified" };
  }

  // Normalize range separators: "2 to 3" and en/em dashes → "-".
  const norm = s.replace(/\s+to\s+/g, "-").replace(/[–—]/g, "-");

  // Range: two numeric tokens around a hyphen. Fractions use "/", never "-", so a
  // hyphen unambiguously separates a range. Take the higher end.
  const hyphen = norm.indexOf("-");
  if (hyphen > 0) {
    const left = parseSingleNumber(norm.slice(0, hyphen));
    const right = parseSingleNumber(norm.slice(hyphen + 1));
    if (left != null && right != null) {
      return { kind: "range", value: Math.max(left, right) };
    }
  }

  // A clean single number.
  const single = parseSingleNumber(norm);
  if (single != null) return { kind: "exact", value: single };

  // A leading number with trailing noise ("2 (14 oz can)") → take the count.
  const lead = norm.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/);
  if (lead) {
    const v = parseSingleNumber(lead[1]);
    if (v != null) return { kind: "exact", value: v };
  }

  return { kind: "unparseable" };
}

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

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
  unit: string | null;
  quantified: number[]; // amounts to sum
  hasUnquantified: boolean;
  sources: GroceryItemSource[];
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

    // A mergeable line keys on (name, unit) so exact-same-unit lines combine.
    // A solo line gets a unique key so it never joins anything.
    const key = amount.soloReason
      ? ` solo ${soloCounter++}`
      : `${name.toLowerCase()} ${unit.toLowerCase()}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        name,
        rawName: line.rawItem.trim() || name,
        category: line.category,
        unit: unit.length > 0 ? unit : null,
        quantified: [],
        hasUnquantified: false,
        sources: [],
      };
      groups.set(key, group);
    }

    if (amount.value != null) group.quantified.push(amount.value);
    else group.hasUnquantified = true;

    group.sources.push({
      recipeId: line.recipeId,
      recipeTitle: line.recipeTitle,
      qty: line.rawQty,
      unit: line.rawUnit,
    });
  }

  const items: AggregatedItem[] = Array.from(groups.values()).map((g) => ({
    name: g.name,
    rawName: g.rawName,
    category: g.category,
    // Sum the quantified contributions; a group with none is "as needed" (null).
    quantity: g.quantified.length > 0 ? roundQty(g.quantified.reduce((a, b) => a + b, 0)) : null,
    unit: g.unit,
    sources: g.sources,
  }));

  // Stable order: by aisle category, then name. Slice C persists section order
  // separately; this is just a deterministic default.
  items.sort((a, b) => {
    const ci = categoryIndex(a.category) - categoryIndex(b.category);
    if (ci !== 0) return ci;
    return a.name.localeCompare(b.name);
  });

  return items;
}
