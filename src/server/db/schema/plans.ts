import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { households } from "./households";
import { recipes } from "./recipes";

// A slot holds a lightweight "meal concept" at plan time (title, rationale,
// ingredient preview pills, tags, est. time, list-view chips). The full recipe
// is generated lazily and linked via recipeId on confirm/cook. See decisions.md
// "Plan generation produces lightweight meal concepts" (2026-05-28).
export const ingredientPreviewSchema = z.array(z.string().max(80)).max(12);
export const slotTagsSchema = z.array(z.string().max(40)).max(6);
export const slotChipsSchema = z.array(z.string().max(60)).max(4);

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
    title: text("title"),
    description: text("description"),
    ingredientPreview: jsonb("ingredient_preview")
      .$type<string[]>()
      .default([]),
    slotTags: jsonb("slot_tags").$type<string[]>().default([]),
    estTimeMinutes: integer("est_time_minutes"),
    chips: jsonb("chips").$type<string[]>().default([]),
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
