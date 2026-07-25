import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  date,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { households, users } from "./households";
import { z } from "zod";

export const dietaryFrameworkSchema = z.enum([
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "mediterranean",
  "other",
]);

export const restrictionsSchema = z.array(z.string().max(100)).max(50);
export const dislikesSchema = z.array(z.string().max(100)).max(50);
export const cuisinePreferencesSchema = z.array(z.string().max(50)).max(20);

// Household composition (Phase 1E, onboarding interview) is defined in
// @/lib/household — a pure module, so the interview UI and the You tab can
// import the same shape without pulling drizzle into the client bundle.
// Relative, not the "@/" alias: drizzle-kit's migration generator resolves this
// file outside the Next.js/tsconfig path mapping.
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  type HouseholdComposition,
} from "../../../lib/household";

export {
  BABY_STAGES,
  babyStageSchema,
  householdCompositionSchema,
  DEFAULT_HOUSEHOLD_COMPOSITION,
  deriveHouseholdSize,
} from "../../../lib/household";
export type { BabyStage, HouseholdComposition } from "../../../lib/household";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  dietaryFramework: text("dietary_framework").default("omnivore"),
  restrictions: jsonb("restrictions").$type<string[]>().default([]),
  dislikes: jsonb("dislikes").$type<string[]>().default([]),
  householdSize: integer("household_size").default(2),
  // Derived-from + richer-than householdSize. householdSize stays the single
  // number every serving consumer reads (plan generation, recipe scaling); this
  // column carries the composition those servings came from, so the chef can
  // cook age-appropriately. Written together — see deriveHouseholdSize.
  householdComposition: jsonb("household_composition")
    .$type<HouseholdComposition>()
    .default(DEFAULT_HOUSEHOLD_COMPOSITION),
  maxCookTimeWeeknight: integer("max_cook_time_weeknight").default(45),
  maxCookTimeWeekend: integer("max_cook_time_weekend").default(90),
  cuisinePreferences: jsonb("cuisine_preferences").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiMemories = pgTable(
  "ai_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    category: text("category", {
      enum: ["preference", "brand", "feedback", "behavior", "restriction"],
    }).notNull(),
    sourceType: text("source_type", {
      enum: ["explicit", "implicit", "onboarding"],
    }).notNull(),
    confidence: real("confidence").notNull().default(0.8),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_memories_household_id_idx").on(table.householdId),
    index("ai_memories_category_idx").on(table.category),
  ]
);

// Daily AI-call accounting, one row per user per UTC day. The per-minute
// limiter (src/server/ratelimit.ts) is in-memory and per-serverless-instance;
// this table is the distributed backstop — a hard daily budget enforced in
// Postgres via atomic upsert, shared across all instances.
export const aiUsageDaily = pgTable(
  "ai_usage_daily",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    calls: integer("calls").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    index("ai_usage_daily_household_id_idx").on(table.householdId),
  ]
);
