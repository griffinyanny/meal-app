// Quantity-string parsing for the grocery aggregator — the "no LLM arithmetic"
// half of the hybrid merge. Every number the grocery list shows is computed here
// by parsing the recipe's OWN quantity strings (fractions, mixed numbers, unicode
// ½, ranges, "a pinch"), never by trusting an AI total. Extracted from aggregate.ts
// so that file stays under the 300-line rule; aggregate.ts re-exports the public
// helpers, so external callers (grocery-talk, grocery-item-mutations) are unchanged.

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

// Read a quantity string as a single number (or null if it carries no amount).
// A thin wrapper over parseQuantity for callers that only want the count —
// splitItem (per-source qty) and the qty-text parser below.
export function numberFromQty(raw: string): number | null {
  const parsed = parseQuantity(raw);
  return parsed.kind === "exact" || parsed.kind === "range" ? parsed.value : null;
}

// Tokens that make up the numeric portion of a quantity string, so the trailing
// remainder can be split off as the unit.
const QTY_NUMERIC_TOKEN = /^[\d./½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞-]+$/;

// Parse a user-typed quantity string (inline qty editing) into the stored
// (quantity, unit) pair. "2 heads" → {2, "heads"}; "1 1/2 cups" → {1.5, "cups"};
// "3" → {3, null}; "as needed"/"" → {null, null}. When there's no readable
// number we store no amount and no unit (renders "as needed"), so an orphan unit
// never lingers without a count.
export function parseQtyText(raw: string): { quantity: number | null; unit: string | null } {
  const text = (raw ?? "").trim();
  if (!text) return { quantity: null, unit: null };

  // Peel the leading numeric tokens (digits, fractions, unicode ½, a "2-3"/"2 to 3"
  // range) off the front; the remainder is the unit. Crucially, parse the numeric
  // part ALONE — passing the whole "1½ cups" to parseQuantity lets the glued-on
  // unit defeat its fraction/range reading (it would fall back to the bare "1").
  const tokens = text.split(/\s+/);
  let i = 0;
  while (
    i < tokens.length &&
    (QTY_NUMERIC_TOKEN.test(tokens[i]) || tokens[i].toLowerCase() === "to")
  ) {
    i++;
  }
  const quantity = numberFromQty(tokens.slice(0, i).join(" "));
  if (quantity == null) return { quantity: null, unit: null };
  const unit = tokens.slice(i).join(" ").trim() || null;
  return { quantity, unit };
}

// Round to milli-precision so summed fractions don't carry float dust (0.1 + 0.2).
export function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}
