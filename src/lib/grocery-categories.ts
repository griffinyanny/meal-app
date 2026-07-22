import { z } from "zod";

// The grocery aisle taxonomy — the single source of truth for both the DB schema
// (server) and the Groceries UI (client). Lives here, free of any Drizzle/pgTable
// import, so a client component can use the category order + labels without
// pulling the server schema into the browser bundle. The schema re-exports these.
export const GROCERY_CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "frozen",
  "pantry",
  "spices",
  "beverages",
  "household",
  "other",
] as const;

export const groceryCategorySchema = z.enum(GROCERY_CATEGORIES);

export type GroceryCategory = z.infer<typeof groceryCategorySchema>;

// Human aisle names for the section headers (matches the imported design).
export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: "Produce",
  dairy: "Dairy & eggs",
  meat: "Meat",
  seafood: "Seafood",
  bakery: "Bakery",
  frozen: "Frozen",
  pantry: "Pantry",
  spices: "Spices & oils",
  beverages: "Beverages",
  household: "Household",
  other: "Other",
};

// Keyword → category guesses for the quick-add optimistic insert, so a typed item
// lands in a plausible aisle instantly. The background tidyItem AI call refines
// it (a wrong guess only means the row hops sections once the tidy lands).
const CATEGORY_KEYWORDS: [GroceryCategory, string[]][] = [
  ["produce", ["apple","banana","avocado","lettuce","spinach","tomato","onion","pepper","lemon","lime","herb","cilantro","parsley","garlic","potato","carrot","broccoli","kale","berr","grape","cucumber","celery","mushroom","zucchini","watermelon","melon","squash","eggplant"]],
  ["dairy", ["milk","cheese","yogurt","egg","butter","cream","parmesan"]],
  ["meat", ["chicken","beef","pork","steak","sausage","bacon","turkey","ground","ribeye"]],
  ["seafood", ["fish","salmon","shrimp","tuna","cod","scallop"]],
  ["bakery", ["bread","bagel","tortilla","bun","roll","baguette"]],
  ["frozen", ["frozen","ice cream","pizza"]],
  ["beverages", ["coffee","tea","juice","soda","water","wine","beer","seltzer"]],
  ["household", ["paper","towel","soap","detergent","trash","foil","wrap","sponge","napkin"]],
  ["spices", ["salt","pepper","oil","vinegar","spice","cumin","paprika","cinnamon"]],
];

// Intentional substring stems: keywords meant to match INSIDE a word. "berr" catches
// blueberry/strawberry/berries. Everything else is matched as a whole word so short
// keywords stop hijacking unrelated compounds — "water"↛"watermelon", "butter"↛
// "butternut", "egg"↛"eggplant" (BUG-001). Multiword keywords ("ice cream") are
// matched as phrases via the space check below.
const SUBSTRING_STEMS = new Set(["berr"]);

function matchesKeyword(name: string, words: string[], kw: string): boolean {
  if (kw.includes(" ") || SUBSTRING_STEMS.has(kw)) return name.includes(kw);
  // Whole word, tolerating a simple -s / -es plural ("bananas", "tomatoes").
  return words.some(
    (w) =>
      w === kw ||
      (w.endsWith("es") && w.slice(0, -2) === kw) ||
      (w.endsWith("s") && w.slice(0, -1) === kw)
  );
}

export function guessCategory(name: string): GroceryCategory {
  const n = name.toLowerCase();
  const words = n.split(/[^a-z]+/).filter(Boolean);
  for (const [cat, kws] of CATEGORY_KEYWORDS) {
    if (kws.some((k) => matchesKeyword(n, words, k))) return cat;
  }
  return "other";
}
