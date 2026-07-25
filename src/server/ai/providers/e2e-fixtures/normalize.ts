// Ingredient-normalization fixture for the E2E AI mock (Phase 1D).
// The doGenerate fixture for the `ingredient-normalize` task. Parses the
// <ingredients> block the prompt builder emits and returns one deterministic
// normalization per line, so the whole generate pipeline (normalize → aggregate
// → write) runs under the mock. canonicalName strips prep notes; the unit map
// normalizes plurals so same-item lines across the week's recipes merge cleanly.

const NORMALIZE_CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(veg|garlic|onion|tomato|lettuce|greens|pepper|carrot|herb|lemon|lime)\b/, "produce"],
  [/\b(oil|flour|sugar|rice|pasta|bean|lentil|broth|stock|sauce|spice|salt)\b/, "pantry"],
  [/\b(milk|cheese|butter|cream|yogurt|egg)\b/, "dairy"],
  [/\b(chicken|beef|pork|steak|turkey)\b/, "meat"],
  [/\b(salmon|shrimp|fish|tuna|cod)\b/, "seafood"],
];

const NORMALIZE_UNIT_MAP: Record<string, string> = {
  cups: "cup",
  cup: "cup",
  cloves: "clove",
  clove: "clove",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  oz: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  cans: "can",
  can: "can",
};

interface NormalizeInputLine {
  index: number;
  unit: string;
  item: string;
}

function extractNormalizeLines(promptText: string): NormalizeInputLine[] {
  const lines: NormalizeInputLine[] = [];
  const re = /\[(\d+)\] qty: "([^"]*)" · unit: "([^"]*)" · item: "([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(promptText)) !== null) {
    lines.push({ index: Number(m[1]), unit: m[3], item: m[4] });
  }
  return lines;
}

function normalizeCanonicalName(item: string): string {
  // Drop prep notes / parentheticals: "garlic, minced" → "garlic".
  return item.split(/[,(]/)[0].trim().toLowerCase() || "item";
}

function normalizeCategory(name: string): string {
  for (const [re, cat] of NORMALIZE_CATEGORY_KEYWORDS) {
    if (re.test(name)) return cat;
  }
  return "other";
}

export function buildNormalizeFixture(promptText: string): {
  items: Array<{
    index: number;
    canonicalName: string;
    category: string;
    canonicalUnit: string;
    numericQty: number | null;
    confidence: number;
  }>;
} {
  const lines = extractNormalizeLines(promptText);
  return {
    items: lines.map((l) => {
      const canonicalName = normalizeCanonicalName(l.item);
      const unit = l.unit.trim().toLowerCase();
      return {
        index: l.index,
        canonicalName,
        category: normalizeCategory(canonicalName),
        canonicalUnit: NORMALIZE_UNIT_MAP[unit] ?? unit,
        numericQty: null, // the aggregator parses the qty string itself
        confidence: 1,
      };
    }),
  };
}
