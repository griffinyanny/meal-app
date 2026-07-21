import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { mealPlans } from "./plans";
import { recipes } from "./recipes";
import { z } from "zod";

// The aisle taxonomy lives in a client-safe module (no Drizzle import) so the
// Groceries UI can share it; re-exported here so `@/server/db/schema` consumers
// are unchanged.
export {
  GROCERY_CATEGORIES,
  groceryCategorySchema,
  type GroceryCategory,
} from "@/lib/grocery-categories";
import { GROCERY_CATEGORIES, groceryCategorySchema } from "@/lib/grocery-categories";

// Persisted section order (category keys in the user's store/aisle order) for the
// "Grouped" organize mode.
export const aisleOrderSchema = z.array(groceryCategorySchema);

// Multi-recipe provenance for a merged grocery item. recipeTitle is denormalized so
// the breakdown sheet renders without a join. See decisions.md (2026-07-20).
export const groceryItemSourceSchema = z.object({
  recipeId: z.string().uuid(),
  recipeTitle: z.string(),
  qty: z.string(),
  unit: z.string(),
});

export type GroceryItemSource = z.infer<typeof groceryItemSourceSchema>;

export const groceryLists = pgTable(
  "grocery_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    mealPlanId: uuid("meal_plan_id").references(() => mealPlans.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["draft", "shopping", "completed"],
    })
      .notNull()
      .default("draft"),
    // Projection lifecycle: the Groceries tab polls this while non-terminal and drives
    // chef-voice loading copy from the phase name. See decisions.md (2026-07-20).
    generationStatus: text("generation_status", {
      enum: [
        "pending",
        "hydrating",
        "normalizing",
        "aggregating",
        "ready",
        "error",
      ],
    })
      .notNull()
      .default("pending"),
    generationError: text("generation_error"),
    organizeMode: text("organize_mode", {
      enum: ["grouped", "manual"],
    })
      .notNull()
      .default("grouped"),
    aisleOrder: jsonb("aisle_order").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("grocery_lists_household_id_idx").on(table.householdId)]
);

export const groceryItems = pgTable(
  "grocery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => groceryLists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rawName: text("raw_name"),
    quantity: real("quantity"),
    unit: text("unit"),
    category: text("category", { enum: [...GROCERY_CATEGORIES] })
      .notNull()
      .default("other"),
    sourceType: text("source_type", {
      enum: ["recipe", "manual", "staple"],
    })
      .notNull()
      .default("manual"),
    sourceRecipeId: uuid("source_recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    // Authoritative multi-recipe provenance (a merged item spans several recipes).
    // sourceRecipeId is kept as the primary source for back-compat. Zod:
    // groceryItemSourceSchema. See decisions.md (2026-07-20).
    sources: jsonb("sources").$type<GroceryItemSource[]>().default([]),
    // Buy-unit display string ("1 carton (32 oz)"), dormant until the buy-unit fast-follow.
    packageLabel: text("package_label"),
    isChecked: boolean("is_checked").notNull().default(false),
    checkedBy: uuid("checked_by"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("grocery_items_household_id_idx").on(table.householdId),
    index("grocery_items_list_id_idx").on(table.listId),
  ]
);

export const stapleItems = pgTable(
  "staple_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", { enum: [...GROCERY_CATEGORIES] })
      .notNull()
      .default("other"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("staple_items_household_id_idx").on(table.householdId)]
);
