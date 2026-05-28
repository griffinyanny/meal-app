import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { recipes } from "./recipes";

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    status: text("status", {
      enum: ["draft", "confirmed", "completed"],
    })
      .notNull()
      .default("draft"),
    chefSummary: text("chef_summary"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("meal_plans_household_id_idx").on(table.householdId)]
);

export const mealPlanSlots = pgTable(
  "meal_plan_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: text("meal_type", {
      enum: ["breakfast", "lunch", "dinner", "snack"],
    }).notNull(),
    recipeId: uuid("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    slotType: text("slot_type", {
      enum: ["recipe", "eating_out", "skip", "leftover"],
    })
      .notNull()
      .default("recipe"),
    servings: integer("servings").default(2),
    rationale: text("rationale"),
    feedback: text("feedback", { enum: ["thumbs_up", "thumbs_down"] }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("meal_plan_slots_household_id_idx").on(table.householdId),
    index("meal_plan_slots_plan_id_idx").on(table.planId),
    index("meal_plan_slots_recipe_id_idx").on(table.recipeId),
  ]
);
