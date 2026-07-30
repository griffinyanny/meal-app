import { z } from "zod";
import { router, protectedProcedure, aiProcedure, bgAiProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import {
  mealPlans,
  mealPlanSlots,
  groceryLists,
  recipes,
} from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { writeMemory } from "@/server/ai/memory";
import { hydrateSlotRecipe, cacheSlotNormalization } from "./plan-hydrate";
import { applyPlanChange, dateToOffset } from "./plan-apply";
import { withPickedServings } from "./plan-read";
import { buildPickRequest, MAX_PICKS_PER_ASK } from "./plan-pick-request";

export const planRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const plan = await ctx.db.query.mealPlans.findFirst({
      where: eq(mealPlans.householdId, ctx.householdId),
      orderBy: desc(mealPlans.weekStart),
    });

    if (!plan) return null;

    const rows = await ctx.db
      .select()
      .from(mealPlanSlots)
      .where(
        and(
          eq(mealPlanSlots.planId, plan.id),
          eq(mealPlanSlots.householdId, ctx.householdId)
        )
      )
      .orderBy(mealPlanSlots.date, mealPlanSlots.mealType);

    const slots = await withPickedServings(ctx.db, ctx.householdId, rows);

    return { ...plan, slots };
  }),

  modify: aiProcedure
    .input(z.object({ request: z.string().min(1).max(1000) }))
    .mutation(({ ctx, input }) =>
      applyPlanChange({
        db: ctx.db,
        householdId: ctx.householdId,
        userId: ctx.user.id,
        request: input.request,
      })
    ),

  // W8 · put a recipe the person chose out of their own library into the week.
  //
  // THE CHEF ANSWERS WITH A NIGHT (ledger §B) — except where the person already
  // did. There is no free `date` input on purpose: the only way to name a night
  // is to have opened the picker FROM one, which is `3e`, whose primary reads
  // "Put it on Thursday". Honouring that is not a scheduler creeping in; it is
  // the frame's own promise. Every other invocation — the intent screen, and
  // `Add to this week` on a recipe — sends nothing, and the chef decides.
  pick: aiProcedure
    .input(
      z.object({
        recipeIds: z.array(z.string().uuid()).min(1).max(MAX_PICKS_PER_ASK),
        replacingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Re-read household-scoped. Ids arrive from a client and are a request,
      // never a fact: one that isn't this household's simply does not come back,
      // so it can reach neither the prompt nor the plan.
      const picks = await ctx.db
        .select({
          id: recipes.id,
          title: recipes.title,
          servings: recipes.servings,
          totalTimeMinutes: recipes.totalTimeMinutes,
        })
        .from(recipes)
        .where(
          and(
            eq(recipes.householdId, ctx.householdId),
            inArray(recipes.id, input.recipeIds)
          )
        );

      if (picks.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Couldn't find those recipes in your library.",
        });
      }

      return applyPlanChange({
        db: ctx.db,
        householdId: ctx.householdId,
        userId: ctx.user.id,
        request: (weekStart) =>
          buildPickRequest(
            picks,
            input.replacingDate
              ? dateToOffset(weekStart, input.replacingDate)
              : null
          ),
        picks,
        pickNightNamed: input.replacingDate != null,
      });
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

      // Create the pending grocery list for this plan. Confirm stays fast — a
      // status flip + an empty draft list; the Groceries tab does the actual
      // projection (grocery.generate). Guarded so a second confirm can't spawn a
      // duplicate list (grocery.current returns the newest, which would otherwise
      // re-trigger generation). See decisions.md "Phase 1D" (2026-07-20).
      const existingList = await ctx.db.query.groceryLists.findFirst({
        where: and(
          eq(groceryLists.mealPlanId, input.planId),
          eq(groceryLists.householdId, ctx.householdId)
        ),
      });
      if (!existingList) {
        await ctx.db.insert(groceryLists).values({
          householdId: ctx.householdId,
          mealPlanId: input.planId,
          status: "draft",
          generationStatus: "pending",
        });
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

  // Background hydration (Phase 1D): turn one plan slot's lightweight concept
  // into a real recipes row and link it. Client-orchestrated per slot during
  // Plan review (see use-plan-hydration). The orchestration (idempotency, the
  // race-safe CAS claim, conditional write-back) lives in ./plan-hydrate.
  hydrateSlot: aiProcedure
    .input(z.object({ slotId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      hydrateSlotRecipe({
        db: ctx.db,
        householdId: ctx.householdId,
        userId: ctx.user.id,
        slotId: input.slotId,
      })
    ),

  // Cache the grocery normalization for one hydrated slot's recipe (Phase 1D
  // latency fix). Fired by the review-time walker right after hydrateSlot succeeds
  // so the ~37s batched normalize is done incrementally during review, off the
  // confirm critical path. Best-effort + idempotent (see cacheSlotNormalization).
  // bgAiProcedure (not aiProcedure): this background fan-out gets its own rate-limit
  // bucket so it never 429s a user-visible hydrate, and it doesn't double-charge the
  // daily budget the recipe-generate already counted. See BUG-004.
  normalizeSlot: bgAiProcedure
    .input(z.object({ slotId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      cacheSlotNormalization({
        db: ctx.db,
        householdId: ctx.householdId,
        slotId: input.slotId,
      })
    ),
});
