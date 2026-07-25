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
import { users, aiMemories } from "@/server/db/schema";
import { householdCompositionSchema } from "@/lib/household";
import { synthesizeMemories } from "@/lib/onboarding/synthesize";
import type { InterviewState } from "@/lib/onboarding/types";

const deepAnswerSchema = z.object({
  questionId: z.string().max(50),
  dimension: z.string().max(30),
  values: z.array(z.string().max(60)).max(12),
  memory: z.string().max(300).nullable(),
});

// The finished interview, as the client accumulated it. Bounded everywhere —
// this is user-controlled input that becomes chef-context text.
const interviewStateSchema = z.object({
  composition: householdCompositionSchema.nullable(),
  dietaryFramework: z.string().max(30).nullable(),
  restrictions: z.array(z.string().max(100)).max(50),
  maxCookTimeWeeknight: z.number().int().min(5).max(300).nullable(),
  cuisinePreferences: z.array(z.string().max(50)).max(20),
  freeTextDimensions: z.array(z.string().max(30)).max(20),
  deepAnswers: z.array(deepAnswerSchema).max(12),
});

export const onboardingMutations = {
  // Completed the interview: write the onboarding memories, stamp the flag.
  // Preferences are already persisted by the per-question writes.
  finishOnboarding: protectedProcedure
    .input(z.object({ state: interviewStateSchema }))
    .mutation(async ({ ctx, input }) => {
      const memories = synthesizeMemories(input.state as InterviewState);

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
