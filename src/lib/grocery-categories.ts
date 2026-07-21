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
