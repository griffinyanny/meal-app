import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { mealPlans } from "./plans";
import { recipes } from "./recipes";
import { z } from "zod";

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
