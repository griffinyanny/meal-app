// Feedback router (Phase 1F, Workstream E). One write path, no read path.
//
// ⚠️ WRITE-ONLY IN R1, DELIBERATELY (E0 call 3). Nothing in the app reads this
// table — Claude sweeps it from the session-start protocol using DATABASE_URL.
// That is also what collapsed E0's question 4: with no in-app reader, LLM
// cleanup at submit time has nobody to be legible for, so cleanup happens at
// sweep time where it is free.
//
// ⚠️ DOOR 2 IS THE ONLY THING UNDER THIS FILE. See `.claude/rules/drizzle-schema.md`
// → "Two doors". RLS does NOT filter the app's own connection (`rolbypassrls`,
// owner role, FORCE off), so `protectedProcedure` plus explicit scoping here is
// the whole of the protection. Every identifier that decides WHO this row
// belongs to is read from `ctx` and never from `input`.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { feedback, clientPayloadSchema } from "@/server/db/schema";
import type { FeedbackPayload } from "@/server/db/schema";
import { checkFeedbackRateLimit } from "@/server/ratelimit";
import { aiMockEnabled } from "@/server/ai/providers/e2e-mock";

// Beyond this the payload stops being diagnostic and starts being a liability.
// ⚠️ Over the ceiling we TRUNCATE rather than reject: losing a bug report to the
// size of its own auto-attached diagnostics is the one failure this feature
// cannot afford. The report is the point; the payload is the convenience.
const MAX_PAYLOAD_BYTES = 100_000;

type Environment = FeedbackPayload["environment"];

// Server-stamped, never client-supplied. "Is this real usage or a seeded run"
// decides whether a report is evidence at all, and a client-asserted answer to
// that question is worth nothing.
function resolveEnvironment(): Environment {
  const raw = process.env.VERCEL_ENV;
  if (raw === "production" || raw === "preview" || raw === "development") {
    return raw;
  }
  // No VERCEL_ENV and not on Vercel = a local dev server or the test runner.
  if (!process.env.VERCEL) return "development";
  return "unknown";
}

function withinBudget(payload: FeedbackPayload): FeedbackPayload {
  if (JSON.stringify(payload).length <= MAX_PAYLOAD_BYTES) return payload;
  // debugPanels is the only unbounded field (a surface publishes whatever it
  // likes), so it is the only one worth dropping. Everything else is capped by
  // its own schema, and the marker says the drop happened rather than leaving a
  // silently-empty object that reads as "this surface publishes nothing".
  return {
    ...payload,
    debugPanels: {
      __truncated: `debugPanels dropped: payload exceeded ${MAX_PAYLOAD_BYTES} bytes`,
    },
  };
}

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        // Exactly what he typed. No claim type, no feature area, no severity —
        // classification is the sweep's job (E0 call 6+7), and asking for it
        // here is friction on the one feature whose thesis is friction-free
        // volume.
        body: z.string().trim().min(1).max(5000),
        // Path in the private `feedback` Storage bucket. The browser uploads
        // direct to Supabase and submits the path it wrote.
        imagePath: z.string().max(500).nullable().default(null),
        payload: clientPayloadSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const limit = checkFeedbackRateLimit(ctx.user.id);
      if (!limit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Give it a minute, then send again — nothing was lost.",
        });
      }

      // ⚠️ NEVER TRUST A CLIENT-SUPPLIED STORAGE PATH. The storage policy scopes
      // what a caller can WRITE; this scopes what they can make us READ later.
      // Without it a caller could point a row at another user's object and the
      // sweep would render it as theirs. Negligible with two trusted users, and
      // the graduation constraint says do not assume a developer-only caller.
      if (input.imagePath && !input.imagePath.startsWith(`${ctx.user.id}/`)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image path must sit under the caller's own prefix.",
        });
      }

      const payload: FeedbackPayload = withinBudget({
        ...input.payload,
        environment: resolveEnvironment(),
        aiMock: aiMockEnabled(),
      });

      const [created] = await ctx.db
        .insert(feedback)
        .values({
          // Both from ctx. `protectedProcedure` resolves householdId from the
          // caller's membership row, and this is the only thing holding door 2.
          householdId: ctx.householdId,
          userId: ctx.user.id,
          body: input.body,
          imagePath: input.imagePath,
          payload,
        })
        .returning({ id: feedback.id });

      return { id: created.id };
    }),
});
