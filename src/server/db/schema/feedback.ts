import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { households, users } from "./households";

// Relative, not the "@/" alias: drizzle-kit's migration generator resolves this
// file outside the Next.js/tsconfig path mapping (same reason memory.ts imports
// lib/household this way).
import type { FeedbackPayload } from "../../../lib/feedback/payload";

export {
  clientPayloadSchema,
  serverStampSchema,
  feedbackPayloadSchema,
  trpcCallSchema,
  TRPC_RING_SIZE,
} from "../../../lib/feedback/payload";
export type {
  ClientPayload,
  ServerStamp,
  FeedbackPayload,
  TrpcCall,
} from "../../../lib/feedback/payload";

// In-app feedback capture (1F/E). Griffin is on the couch with his phone, hits
// something wrong, taps one control, and says what happened; everything needed
// to diagnose it is attached automatically. Claude sweeps this table at session
// start and files the results into bug-tracker.md / idea-backlog.md.
//
// ⚠️ NO CLAIM-TYPE COLUMN, DELIBERATELY (E0 call 6+7). The obvious design is a
// `type: defect | product_direction` column, and it is wrong: a single
// submission routinely holds BOTH ("the quantity editor drops the unit, and
// honestly we should let you type '2 lbs' directly"). Claim type is a property
// of a CLAIM; a submission holds one or more of them; a one-to-many
// relationship cannot live in a column on the parent. The sweep decomposes one
// row into 1..N typed claims. That is also why the capture sheet asks for no
// classification: it would be work, done by the wrong person, at the worst
// moment, on a feature whose whole thesis is friction-free volume.
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    // This IS the `source` field the weighting call needs, and it is a user id
    // rather than a string label ("griffin" / "wife") ON PURPOSE: the S60 call
    // weights product-direction items by who filed them, and a string stops
    // working the moment a third person exists. Part of the graduation
    // constraint — this table must not assume a developer-only caller.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Exactly what he typed. Untyped, unclassified, uncleaned — cleanup happens
    // at sweep time, where it is free (E0 call 4).
    body: text("body").notNull(),
    // Path in the private `feedback` Storage bucket, e.g. "<userId>/<uuid>.png".
    // Null when no screenshot was attached. The browser uploads DIRECT to
    // Supabase (never through our own server: fewer moving parts, and it
    // sidesteps Vercel's 4.5MB request-body limit), then submits this path.
    imagePath: text("image_path"),
    payload: jsonb("payload").$type<FeedbackPayload>().notNull(),
    // ⚠️ MANDATORY, not a nicety. Without it the session-start sweep re-files
    // every report it has ever seen, every session.
    status: text("status", { enum: ["new", "swept"] })
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_household_id_idx").on(table.householdId),
    // The sweep's only query is `WHERE status = 'new'`.
    index("feedback_status_idx").on(table.status),
  ]
);
