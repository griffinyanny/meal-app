import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { mealPlans } from "./plans";
import { z } from "zod";

export const ingredientSchema = z.object({
  qty: z.string(),
  unit: z.string(),
  item: z.string(),
  notes: z.string().optional(),
  group: z.string().optional(),
});

export const stepSchema = z.object({
  number: z.number(),
  text: z.string(),
  durationMinutes: z.number().optional(),
  timers: z
    .array(z.object({ label: z.string(), minutes: z.number() }))
    .optional(),
});

export const tagsSchema = z.array(z.string().max(50)).max(30);

export type Ingredient = z.infer<typeof ingredientSchema>;
export type Step = z.infer<typeof stepSchema>;

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    totalTimeMinutes: integer("total_time_minutes"),
    sourceType: text("source_type", {
      enum: [
        "ai_generated",
        "url_import",
        "manual",
        "modification",
        "plan_generated",
      ],
    }).notNull(),
    sourceUrl: text("source_url"),
    parentRecipeId: uuid("parent_recipe_id"),
    // Set when a recipe is hydrated for a plan slot. Cascades away when the plan is
    // deleted/replaced (draft cleanup); nulled on graduation (favorite/cook) so the
    // recipe survives. See decisions.md "Phase 1D Groceries architecture" (2026-07-20).
    sourcePlanId: uuid("source_plan_id").references(() => mealPlans.id, {
      onDelete: "cascade",
    }),
    ingredients: jsonb("ingredients").$type<Ingredient[]>().notNull(),
    steps: jsonb("steps").$type<Step[]>().notNull(),
    generationPrompt: text("generation_prompt"),
    generationModel: text("generation_model"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    lastCookedAt: timestamp("last_cooked_at", { withTimezone: true }),
    cookCount: integer("cook_count").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("recipes_household_id_idx").on(table.householdId),
    index("recipes_parent_recipe_id_idx").on(table.parentRecipeId),
    index("recipes_source_plan_id_idx").on(table.sourcePlanId),
  ]
);
