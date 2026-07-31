import { z } from "zod";
import { router, authedProcedure, protectedProcedure } from "../init";
import {
  users,
  households,
  householdMembers,
  userPreferences,
  aiMemories,
  dietaryFrameworkSchema,
  restrictionsSchema,
  dislikesSchema,
  cuisinePreferencesSchema,
} from "@/server/db/schema";
import { householdCompositionSchema, deriveHouseholdSize } from "@/lib/household";
import { eq, and, desc } from "drizzle-orm";
import { userTalkMutations } from "./user-talk";
import { onboardingMutations } from "./user-onboarding";
import { devToolsProcedures } from "./user-dev-tools";

export const userRouter = router({
  ensureOnboarded: authedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db.query.householdMembers.findFirst({
      where: eq(householdMembers.userId, ctx.user.id),
    });

    if (existing) {
      // The interview gate (Phase 1E #4) rides on the bootstrap call the shell
      // already makes, so first paint costs no extra round-trip. NULL here means
      // the interview has never run — neither completed nor skipped.
      const me = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });
      return {
        status: "already_onboarded" as const,
        householdId: existing.householdId,
        onboardingCompletedAt: me?.onboardingCompletedAt ?? null,
      };
    }

    const [user] = await ctx.db
      .insert(users)
      .values({
        id: ctx.user.id,
        email: ctx.user.email!,
        displayName: ctx.user.user_metadata?.full_name ?? null,
        avatarUrl: ctx.user.user_metadata?.avatar_url ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: ctx.user.email!,
          displayName: ctx.user.user_metadata?.full_name ?? null,
          avatarUrl: ctx.user.user_metadata?.avatar_url ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Concurrency-safe first-login onboarding: household + membership are
    // created in one transaction, and household_members.user_id is UNIQUE.
    // If two first-login calls race (e.g. double-mounted guard, two tabs),
    // the loser's membership insert hits the unique index, its transaction
    // rolls back (discarding the orphan household), and we return the
    // winner's household instead.
    try {
      return await ctx.db.transaction(async (tx) => {
        const [household] = await tx
          .insert(households)
          .values({ name: `${user.displayName ?? "My"}'s Kitchen` })
          .returning();

        await tx.insert(householdMembers).values({
          householdId: household.id,
          userId: user.id,
          role: "owner",
        });

        // A brand-new user has by definition not done the interview yet.
        return {
          status: "created" as const,
          householdId: household.id,
          onboardingCompletedAt: null,
        };
      });
    } catch (error) {
      const winner = await ctx.db.query.householdMembers.findFirst({
        where: eq(householdMembers.userId, ctx.user.id),
      });
      if (winner) {
        // Lost the first-login race. The winning transaction created this user
        // moments ago, so the interview hasn't run — but read the flag rather
        // than assuming, so a retry after a completed interview stays correct.
        const me = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        });
        return {
          status: "already_onboarded" as const,
          householdId: winner.householdId,
          onboardingCompletedAt: me?.onboardingCompletedAt ?? null,
        };
      }
      throw error;
    }
  }),

  preferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    return prefs ?? null;
  }),

  // Account/household basics for the You-tab footer (feature #1): display name,
  // email, household name. One read so the footer doesn't fan out queries.
  account: protectedProcedure.query(async ({ ctx }) => {
    const [me, household] = await Promise.all([
      ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) }),
      ctx.db.query.households.findFirst({
        where: eq(households.id, ctx.householdId),
      }),
    ]);

    return {
      displayName: me?.displayName ?? null,
      email: me?.email ?? ctx.user.email ?? null,
      householdName: household?.name ?? null,
    };
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        dietaryFramework: dietaryFrameworkSchema.optional(),
        restrictions: restrictionsSchema.optional(),
        dislikes: dislikesSchema.optional(),
        // BUG-011 · householdSize is READ-ONLY. It is a DERIVATION of the
        // composition, and while it was independently writable it had three
        // writers that never touched composition — so the chef prompt could
        // carry "Default servings: 4" beside "Cooking for 2 adults and 1 baby".
        // Both remaining writers (the You-tab sheet, the set_household talk op)
        // now send bands, and the server derives the count from them here.
        // Nullable so an UNDO can put it back to never-answered. Without that,
        // undoing the first household edit would leave a composition the person
        // never actually gave — reintroducing BUG-010 through the back door.
        householdComposition: householdCompositionSchema.nullable().optional(),
        maxCookTimeWeeknight: z.number().int().min(5).max(300).optional(),
        maxCookTimeWeekend: z.number().int().min(5).max(600).optional(),
        cuisinePreferences: cuisinePreferencesSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Composition is authoritative, full stop: the servings count is DERIVED
      // from it server-side, so nothing can post a householdSize that
      // contradicts the bands it came from — there is no longer any way to send
      // one (BUG-011).
      // The pair moves together or not at all. An explicit null means "we don't
      // know who they cook for", and a stale servings count next to that is the
      // same contradiction in a quieter form, so the count goes unknown too —
      // every consumer already falls back with `?? 2`.
      const values =
        input.householdComposition === undefined
          ? input
          : {
              ...input,
              householdSize: input.householdComposition
                ? deriveHouseholdSize(input.householdComposition)
                : null,
            };

      const [result] = await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
          householdId: ctx.householdId,
          ...values,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { ...values, updatedAt: new Date() },
        })
        .returning();

      return result;
    }),

  memories: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          category: z
            .enum(["preference", "brand", "feedback", "behavior", "restriction"])
            .optional(),
          // The You-tab ledger passes true so removed/dismissed memories drop out
          // (matching getChefContext). Defaults false to preserve the raw read.
          activeOnly: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      let where = eq(aiMemories.householdId, ctx.householdId);

      if (input?.category) {
        where = and(where, eq(aiMemories.category, input.category))!;
      }
      if (input?.activeOnly) {
        where = and(where, eq(aiMemories.isActive, true))!;
      }

      return ctx.db
        .select()
        .from(aiMemories)
        .where(where)
        .orderBy(desc(aiMemories.createdAt))
        .limit(limit);
    }),

  // AI-first capture (feature #5, the design hero) — free text → constraint +
  // memory ops, with an undo payload. Implementation in ./user-talk.
  ...userTalkMutations,

  // The onboarding interview's terminal writes (feature #4). Implementation in
  // ./user-onboarding.
  ...onboardingMutations,
  ...devToolsProcedures,
});
