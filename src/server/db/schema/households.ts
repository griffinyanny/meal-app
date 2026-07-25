import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Set once by BOTH the completed AND the skipped onboarding interview (Phase
  // 1E #4) — the interview fires on first login and never nags again. Lives on
  // users, not user_preferences: the users row is guaranteed to exist before the
  // app renders (ensureOnboarded creates it), while a preferences row is written
  // lazily, so a pre-interview user has none. NULL = the interview hasn't run.
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("owner"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
    // V1 model: one household per user. Makes concurrent first-login
    // onboarding race-safe at the DB level (see user.ensureOnboarded).
    uniqueIndex("household_members_user_id_unique").on(table.userId),
  ]
);
