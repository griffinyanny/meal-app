// Test-mode controls (Griffin, S39). Spread into userRouter, so the client calls
// trpc.user.devToolsEnabled / trpc.user.resetOnboarding.
//
// WHY THIS EXISTS: the onboarding interview fires exactly once per account, and
// most of the app's interesting states are reached by living in it for a week.
// Without a way back to the start, "test this on your phone" means asking Griffin
// to burn his only real first run on a build we already know we'll change. His
// standing ask, recorded in engineering-principles.md: every feature ships with a
// way to get into its states, reset them, and report on them.
//
// WHY AN EMAIL ALLOWLIST, NOT A NODE_ENV CHECK: the phone is on production. A
// `NODE_ENV !== "production"` gate would disable this exactly where it's needed
// and give a false sense of safety besides. The allowlist is empty by default, so
// an unconfigured deployment has no dev tools at all, and it is read server-side
// only — the client is TOLD whether it may show the controls, and is never
// trusted about it.
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../init";
import { users, userPreferences, aiMemories } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { isDevToolsUser } from "@/lib/access";

// Comma-separated emails, e.g. DEV_TOOLS_EMAILS="griffin@example.com,wife@example.com".
// Unset means nobody, which is the correct default for a real deployment — note
// this is the OPPOSITE default to ALLOWED_EMAILS, which opens up when unset.
// Only the parsing is shared; the two answer "empty list" differently on purpose.
// Moved to `@/lib/access` (1F/E) so the (app) layout can ask the same question
// without a client round trip. One definition, two callers.
const isDevUser = isDevToolsUser;

export const devToolsProcedures = {
  // Whether to render the test-mode section at all. A query rather than a build
  // flag so turning it on for a second tester is an env change, not a deploy of
  // different code.
  devToolsEnabled: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    return { enabled: isDevUser(me?.email ?? ctx.user.email) };
  }),

  // Back to a genuine first run: clears the completed flag, the preferences row,
  // and the memories the interview wrote. Deliberately scoped to what the
  // INTERVIEW created — memories captured later from real use (implicit thumbs,
  // Talk-to-Chef) are not onboarding artifacts, and wiping them would make this
  // a "delete my account" button wearing a test-mode label.
  resetOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const me = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    if (!isDevUser(me?.email ?? ctx.user.email)) {
      // Re-checked here rather than trusted from the query above: the client
      // knowing the control exists is not authorization to fire it.
      throw new TRPCError({ code: "FORBIDDEN", message: "Test mode is not enabled." });
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .delete(aiMemories)
        .where(
          and(
            eq(aiMemories.userId, ctx.user.id),
            eq(aiMemories.sourceType, "onboarding")
          )
        );
      await tx.delete(userPreferences).where(eq(userPreferences.userId, ctx.user.id));
      await tx
        .update(users)
        .set({ onboardingCompletedAt: null, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));
    });

    return { reset: true };
  }),
};
