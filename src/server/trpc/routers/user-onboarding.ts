// The onboarding interview's two terminal writes (Phase 1E, feature #4). Split
// out of user.ts to keep it under the 300-line rule; spread into userRouter so
// the client calls trpc.user.finishOnboarding / trpc.user.skipOnboarding.
//
// The interview persists its typed answers AS IT GOES via user.updatePreferences
// (so abandoning halfway still leaves the chef knowing what you told it, and the
// reflect screen's "all saved" is honest). These two mutations own the parts
// that can only happen at the end:
//   - the sourceType:'onboarding' memories synthesized from the whole run
//   - the onboarding-complete flag, which BOTH paths set so the interview fires
//     once and never nags again
//
// The memories are built deterministically from typed answers (see
// synthesize.ts) — no model call at the last step of a first run.
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../init";
import {
  users,
  aiMemories,
  restrictionsSchema,
  cuisinePreferencesSchema,
} from "@/server/db/schema";
import { householdCompositionSchema } from "@/lib/household";
import { synthesizeMemories } from "@/lib/onboarding/synthesize";
import { asDietaryFramework } from "@/lib/diet";

// BUG-013 · `memory` and `dimension` are DELIBERATELY absent. Both are
// derivations the client happens to hold, and both are recomputed server-side
// from `questionId` + `values` against the question bank. Zod strips unknown
// keys, so the client posts the state it has and the two fields simply never
// reach this process — which is stronger than ignoring them, because there is
// nothing left here to start trusting again by accident.
const deepAnswerSchema = z.object({
  questionId: z.string().max(50),
  values: z.array(z.string().max(60)).max(12),
});

// The finished interview, as the client accumulated it. Bounded everywhere —
// this is user-controlled input that becomes chef-context text.
//
// The array fields reuse the SAME schemas `user.updatePreferences` enforces
// rather than restating their bounds a second time.
//
// ⚠️ `dietaryFramework` is now COERCED to the domain rather than accepted as a
// bounded string (BUG-044, closed in 1F/D). The list lives in `@/lib/diet` and
// the persist path's enum is built from it, so the two boundaries can no longer
// disagree about what a framework is — which is how BUG-013's echo got there.
//
// Coerced, not rejected, and that is a deliberate deviation from the tracker's
// recommendation ("narrow it to the enum"). Applied literally, an unrecognised
// value would 400 the whole `finishOnboarding` call — the LAST step of an
// interview that fires exactly once per account — to protect a field this path
// never persists. `asDietaryFramework` fails safe instead, and the parsed type
// is `DietaryFramework | null` either way, which was the actual complaint.
export const interviewStateSchema = z.object({
  composition: householdCompositionSchema.nullable(),
  dietaryFramework: z
    .string()
    .max(30)
    .nullable()
    .transform((v) => asDietaryFramework(v)),
  restrictions: restrictionsSchema,
  maxCookTimeWeeknight: z.number().int().min(5).max(300).nullable(),
  cuisinePreferences: cuisinePreferencesSchema,
  freeTextDimensions: z.array(z.string().max(30)).max(20),
  // Display-only on the client, and nothing here reads it. Accepted (and
  // bounded) rather than rejected so the client can post the state it holds.
  quotedLine: z.string().max(500).nullable().optional(),
  deepAnswers: z.array(deepAnswerSchema).max(12),
});

export const onboardingMutations = {
  // Completed the interview: write the onboarding memories, stamp the flag.
  // Preferences are already persisted by the per-question writes.
  finishOnboarding: protectedProcedure
    .input(z.object({ state: interviewStateSchema }))
    .mutation(async ({ ctx, input }) => {
      const memories = synthesizeMemories(input.state);

      const written = await ctx.db.transaction(async (tx) => {
        const rows = await tx
          .insert(aiMemories)
          .values(
            memories.map((m) => ({
              householdId: ctx.householdId,
              userId: ctx.user.id,
              content: m.content,
              category: m.category,
              // The whole point of this mutation: these are onboarding
              // memories, not the "explicit" that user.talk stamps. It's what
              // makes the You ledger say "You told me when we started".
              sourceType: "onboarding" as const,
            }))
          )
          .returning({ id: aiMemories.id });

        await tx
          .update(users)
          .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, ctx.user.id));

        return rows;
      });

      return { memoriesWritten: written.length, skipped: false };
    }),

  // Skipped: no preferences, no memories, but the SAME flag — skip-to-app is
  // first-class, and a skipped interview must never re-prompt.
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, ctx.user.id));

    return { memoriesWritten: 0, skipped: true };
  }),
};
