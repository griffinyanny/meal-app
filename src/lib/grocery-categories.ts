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
  ["produce", ["apple","banana","avocado","lettuce","spinach","tomato","onion","pepper","lemon","lime","herb","cilantro","parsley","garlic","potato","carrot","broccoli","kale","berr","grape","cucumber","celery","mushroom","zucchini"]],
  ["dairy", ["milk","cheese","yogurt","egg","butter","cream","parmesan"]],
  ["meat", ["chicken","beef","pork","steak","sausage","bacon","turkey","ground","ribeye"]],
  ["seafood", ["fish","salmon","shrimp","tuna","cod","scallop"]],
  ["bakery", ["bread","bagel","tortilla","bun","roll","baguette"]],
  ["frozen", ["frozen","ice cream","pizza"]],
  ["beverages", ["coffee","tea","juice","soda","water","wine","beer","seltzer"]],
  ["household", ["paper","towel","soap","detergent","trash","foil","wrap","sponge","napkin"]],
  ["spices", ["salt","pepper","oil","vinegar","spice","cumin","paprika","cinnamon"]],
];

export function guessCategory(name: string): GroceryCategory {
  const n = name.toLowerCase();
  for (const [cat, kws] of CATEGORY_KEYWORDS) {
    if (kws.some((k) => n.includes(k))) return cat;
  }
  return "other";
}
