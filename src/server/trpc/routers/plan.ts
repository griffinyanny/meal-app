import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { mealPlans, mealPlanSlots } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const planRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const plan = await ctx.db.query.mealPlans.findFirst({
      where: eq(mealPlans.householdId, ctx.householdId),
      orderBy: desc(mealPlans.weekStart),
    });

    if (!plan) return null;

    const slots = await ctx.db
      .select()
      .from(mealPlanSlots)
      .where(
        and(
          eq(mealPlanSlots.planId, plan.id),
          eq(mealPlanSlots.householdId, ctx.householdId)
        )
      )
      .orderBy(mealPlanSlots.date, mealPlanSlots.mealType);

    return { ...plan, slots };
  }),

  confirm: protectedProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(mealPlans)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mealPlans.id, input.planId),
            eq(mealPlans.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),

  feedback: protectedProcedure
    .input(
      z.object({
        slotId: z.string().uuid(),
        feedback: z.enum(["thumbs_up", "thumbs_down"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(mealPlanSlots)
        .set({ feedback: input.feedback, updatedAt: new Date() })
        .where(
          and(
            eq(mealPlanSlots.id, input.slotId),
            eq(mealPlanSlots.householdId, ctx.householdId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),
});
