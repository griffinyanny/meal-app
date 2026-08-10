// The auto-attached diagnostic payload for in-app feedback (1F/E, E0 call 5).
//
// PURE MODULE — no drizzle, no server imports. The client assembles the payload,
// the schema file imports these types for its jsonb column, and the sweep reads
// them back. Keeping it here is what lets all three share one definition rather
// than three that agree by hand (BUG-044's shape).
//
// ⚠️ THE SPLIT MATTERS: `clientPayloadSchema` is everything the browser knows and
// can therefore assert about itself; `serverStampSchema` is what the server adds
// at submit and the client cannot forge. "Seeded vs real" lives on the server
// side deliberately — a client-supplied answer to "is this real data" is worth
// nothing, and the server already knows.
import { z } from "zod";

// Bounded so one runaway report cannot write an unbounded row. 20 calls is
// several screens of interaction, which is the window a report is about.
export const TRPC_RING_SIZE = 20;

/**
 * One entry in the recent-tRPC-calls ring buffer.
 *
 * ⚠️ PATH, STATUS AND DURATION ONLY. NEVER INPUTS OR OUTPUTS.
 *
 * This is BUG-060's class arriving through a new door, pre-empted rather than
 * discovered: logging tRPC inputs would put the grocery list, the week's meal
 * titles and the user's dietary constraints into this table via a channel nobody
 * was watching — exactly how templated `aria-label`s put them into session
 * replay. The shape below has no field that can hold household content, which is
 * a constraint by construction rather than by instruction.
 *
 * (`debugPanels` below DOES carry household content, and that is fine and
 * deliberate: it is diagnostic state we chose to publish, in the household's own
 * database. The distinction is chosen-and-bounded vs. incidental-and-open.)
 */
export const trpcCallSchema = z.object({
  path: z.string().max(200),
  type: z.enum(["query", "mutation", "subscription"]),
  ok: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  // Milliseconds before capture, not a wall-clock time: the report is read days
  // later and "-1400ms" is the legible fact, not a timestamp to subtract.
  msBeforeCapture: z.number().int().nonnegative(),
});
export type TrpcCall = z.infer<typeof trpcCallSchema>;

export const clientPayloadSchema = z.object({
  // Where he was when it broke. This is also why the sheet has no feature-area
  // select (E0 call 6+7) — the route already says it.
  route: z.string().max(500),
  viewport: z.object({
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
  }),
  userAgent: z.string().max(500),
  // True in an installed PWA, false in a Safari tab. Several defects in this
  // project have been standalone-only (S59's manifest, S60's service worker),
  // so which container it was is a first-class diagnostic fact.
  standalone: z.boolean(),
  // Needs NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA exposed in Vercel project settings.
  // Null rather than absent when unavailable, so "we could not tell" is a value
  // rather than a missing key.
  buildSha: z.string().max(64).nullable(),
  // ⚠️ THE JOIN TO SESSION REPLAY. Without it the replay exists and is
  // unfindable. A URL rather than the bare session id because it is clickable.
  replayUrl: z.string().max(1000).nullable(),
  sentryEventId: z.string().max(64).nullable(),
  // readDebugPanels(). ⚠️ ONE registration site exists today
  // (plan-page-client.tsx) plus the one E1 adds to Groceries, so this is `{}` on
  // Recipes, You and onboarding — the route and the ring buffer are what cover
  // those. The scope doc's "already produces most of this" was measured false.
  debugPanels: z.record(z.string(), z.unknown()),
  trpcCalls: z.array(trpcCallSchema).max(TRPC_RING_SIZE),
  // ⚠️ Snapshotted at sheet-OPEN, not at submit. Opening a sheet can itself
  // change state, and the report may be typed a minute later. The gap between
  // this and the row's createdAt is itself diagnostic.
  capturedAt: z.string().datetime(),
});
export type ClientPayload = z.infer<typeof clientPayloadSchema>;

// Added by the server at submit. Unforgeable by the caller, which is the point:
// "is this real usage or a seeded run" decides whether a report is evidence, and
// a client-asserted answer to that question is worth nothing.
export const serverStampSchema = z.object({
  environment: z.enum(["production", "preview", "development", "unknown"]),
  // The deterministic E2E provider was answering, so any AI content in this
  // report is fixture text rather than a real generation.
  aiMock: z.boolean(),
});
export type ServerStamp = z.infer<typeof serverStampSchema>;

export const feedbackPayloadSchema = clientPayloadSchema.extend(
  serverStampSchema.shape
);
export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;
