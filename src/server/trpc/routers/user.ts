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
import { eq, and, desc } from "drizzle-orm";

export const userRouter = router({
  ensureOnboarded: authedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db.query.householdMembers.findFirst({
      where: eq(householdMembers.userId, ctx.user.id),
    });

    if (existing) {
      return { status: "already_onboarded" as const, householdId: existing.householdId };
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

    const [household] = await ctx.db
      .insert(households)
      .values({ name: `${user.displayName ?? "My"}'s Kitchen` })
      .returning();

    await ctx.db.insert(householdMembers).values({
      householdId: household.id,
      userId: user.id,
      role: "owner",
    });

    return { status: "created" as const, householdId: household.id };
  }),

  preferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    return prefs ?? null;
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        dietaryFramework: dietaryFrameworkSchema.optional(),
        restrictions: restrictionsSchema.optional(),
        dislikes: dislikesSchema.optional(),
        householdSize: z.number().int().min(1).max(20).optional(),
        maxCookTimeWeeknight: z.number().int().min(5).max(300).optional(),
        maxCookTimeWeekend: z.number().int().min(5).max(600).optional(),
        cuisinePreferences: cuisinePreferencesSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
          householdId: ctx.householdId,
          ...input,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { ...input, updatedAt: new Date() },
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
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      let where = eq(aiMemories.householdId, ctx.householdId);

      if (input?.category) {
        where = and(where, eq(aiMemories.category, input.category))!;
      }

      return ctx.db
        .select()
        .from(aiMemories)
        .where(where)
        .orderBy(desc(aiMemories.createdAt))
        .limit(limit);
    }),
});
