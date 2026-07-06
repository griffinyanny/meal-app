import { z } from "zod";
import { router, protectedProcedure, aiProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { mealPlans, mealPlanSlots } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getChefContext, writeMemory } from "@/server/ai/memory";
import { modifyPlan } from "@/server/ai/tasks/modify-plan";
import { validateModification, toSlotValues } from "@/server/ai/tasks/plan-types";

// Whole days between two ISO date strings (UTC, date-only).
function dateToOffset(weekStart: string, date: string): number {
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  const day = Date.parse(`${date}T00:00:00Z`);
  return Math.round((day - start) / 86_400_000);
}

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

  modify: aiProcedure
    .input(z.object({ request: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.mealPlans.findFirst({
        where: eq(mealPlans.householdId, ctx.householdId),
        orderBy: desc(mealPlans.weekStart),
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "There's no plan to change yet — generate one first.",
        });
      }

      const slots = await ctx.db
        .select()
        .from(mealPlanSlots)
        .where(
          and(
            eq(mealPlanSlots.planId, plan.id),
            eq(mealPlanSlots.householdId, ctx.householdId)
          )
        );

      const weekStart = plan.weekStart;
      const chef = await getChefContext(ctx.db, ctx.householdId, ctx.user.id);

      const mod = await modifyPlan({
        request: input.request,
        currentMeals: slots.map((s) => ({
          dayOffset: dateToOffset(weekStart, s.date),
          slotType: s.slotType,
          title: s.title,
        })),
        ...chef,
      });

      const validated = validateModification(mod, {
        weekStart,
        defaultServings: chef.householdSize,
      });

      // Map AI-returned days to slots within THIS household-scoped plan only —
      // we never trust or apply AI-supplied DB IDs.
      const slotByDate = new Map(slots.map((s) => [s.date, s]));

      await ctx.db.transaction(async (tx) => {
        for (const meal of validated.changedMeals) {
          const existing = slotByDate.get(meal.date);
          if (existing) {
            await tx
              .update(mealPlanSlots)
              .set({
                mealType: "dinner",
                ...toSlotValues(meal),
                feedback: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(mealPlanSlots.id, existing.id),
                  eq(mealPlanSlots.householdId, ctx.householdId)
                )
              );
          } else {
            await tx.insert(mealPlanSlots).values({
              householdId: ctx.householdId,
              planId: plan.id,
              mealType: "dinner",
              ...toSlotValues(meal),
            });
          }
        }

        for (const date of validated.removedDates) {
          const existing = slotByDate.get(date);
          if (!existing) continue;
          await tx
            .update(mealPlanSlots)
            .set({
              slotType: "eating_out",
              title: null,
              description: null,
              ingredientPreview: [],
              slotTags: [],
              estTimeMinutes: null,
              chips: [],
              rationale: null,
              recipeId: null,
              feedback: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(mealPlanSlots.id, existing.id),
                eq(mealPlanSlots.householdId, ctx.householdId)
              )
            );
        }
      });

      const updatedSlots = await ctx.db
        .select()
        .from(mealPlanSlots)
        .where(
          and(
            eq(mealPlanSlots.planId, plan.id),
            eq(mealPlanSlots.householdId, ctx.householdId)
          )
        )
        .orderBy(mealPlanSlots.date, mealPlanSlots.mealType);

      return {
        chefResponse: validated.chefResponse,
        plan: { ...plan, slots: updatedSlots },
      };
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
      const slot = await ctx.db.query.mealPlanSlots.findFirst({
        where: and(
          eq(mealPlanSlots.id, input.slotId),
          eq(mealPlanSlots.householdId, ctx.householdId)
        ),
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // No-op if unchanged — avoids spamming the memory log on repeat taps.
      if (slot.feedback === input.feedback) return slot;

      const [updated] = await ctx.db
        .update(mealPlanSlots)
        .set({ feedback: input.feedback, updatedAt: new Date() })
        .where(eq(mealPlanSlots.id, slot.id))
        .returning();

      // Teach the chef from the signal so future plans reflect it.
      if (updated.title) {
        await writeMemory({
          db: ctx.db,
          householdId: ctx.householdId,
          userId: ctx.user.id,
          content:
            input.feedback === "thumbs_up"
              ? `Enjoyed "${updated.title}" as a weeknight dinner.`
              : `Didn't love "${updated.title}" — suggest it less often.`,
          category: "feedback",
          sourceType: "implicit",
          confidence: 0.7,
        });
      }

      return updated;
    }),
});
