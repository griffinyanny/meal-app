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
