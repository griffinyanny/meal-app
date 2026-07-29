// Applying a chef-authored change to the current week.
//
// Extracted from the plan router when W8 gave it a SECOND caller: `modify` (the
// person asks in words) and `pick` (the person hands over a recipe) are the same
// operation underneath — ask the chef for a diff, then write it — and the parts
// that are easy to get wrong are shared. Chiefly: never trusting an AI-supplied
// id, and deciding what a rewritten night does to a pick that was on it.
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import type { getDb } from "@/server/db";
import { mealPlans, mealPlanSlots } from "@/server/db/schema";
import { getChefContext } from "@/server/ai/memory";
import { modifyPlan } from "@/server/ai/tasks/modify-plan";
import { validateModification, toSlotValues } from "@/server/ai/tasks/plan-types";
import { resolvePickedRecipeId, type PickInput } from "@/server/ai/tasks/plan-picks";
import { withPickedServings } from "./plan-read";

type Db = ReturnType<typeof getDb>;

// Whole days between two ISO date strings (UTC, date-only).
export function dateToOffset(weekStart: string, date: string): number {
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  const day = Date.parse(`${date}T00:00:00Z`);
  return Math.round((day - start) / 86_400_000);
}

export interface ApplyChangeArgs {
  db: Db;
  householdId: string;
  userId: string;
  /**
   * What to ask the chef for. A function when the wording depends on the week —
   * the pick path names the day being displaced, and `weekStart` is not known
   * until this function has read the plan.
   */
  request: string | ((weekStart: string) => string);
  /** W8 · the library recipes this change is introducing, if any. */
  picks?: PickInput[];
  /** True when the pick's night was named by the person rather than the chef. */
  pickNightNamed?: boolean;
}

export async function applyPlanChange({
  db,
  householdId,
  userId,
  request,
  picks = [],
  pickNightNamed,
}: ApplyChangeArgs) {
  const plan = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.householdId, householdId),
    orderBy: desc(mealPlans.weekStart),
  });

  if (!plan) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "There's no plan to change yet — generate one first.",
    });
  }

  const slots = await db
    .select()
    .from(mealPlanSlots)
    .where(
      and(
        eq(mealPlanSlots.planId, plan.id),
        eq(mealPlanSlots.householdId, householdId)
      )
    );

  const weekStart = plan.weekStart;
  const chef = await getChefContext(db, householdId, userId);

  const mod = await modifyPlan({
    request: typeof request === "function" ? request(weekStart) : request,
    currentMeals: slots.map((s) => ({
      dayOffset: dateToOffset(weekStart, s.date),
      slotType: s.slotType,
      title: s.title,
    })),
    picks,
    pickNightNamed,
    ...chef,
  });

  const validated = validateModification(mod, {
    weekStart,
    defaultServings: chef.householdSize,
  });

  // Map AI-returned days to slots within THIS household-scoped plan only — we
  // never trust or apply AI-supplied DB IDs.
  const slotByDate = new Map(slots.map((s) => [s.date, s]));

  await db.transaction(async (tx) => {
    for (const meal of validated.changedMeals) {
      const pickedRecipeId = resolvePickedRecipeId(meal.pickedRef, picks);
      // A picked slot is already a real recipe, so it is born "ready" rather
      // than "stale" — that keeps the hydration walker from generating over the
      // person's own recipe, and gives build dependency 4 a recipeId to warm the
      // normalize cache from at pick time instead of at confirm.
      const recipeLink = pickedRecipeId
        ? {
            pickedRecipeId,
            recipeId: pickedRecipeId,
            recipeStatus: "ready" as const,
          }
        : {
            // A NIGHT THE CHEF REWROTE IS NO LONGER THE NIGHT THAT WAS PICKED.
            // Clearing provenance here is the honest direction: the eyebrow
            // would otherwise keep claiming PICKED over a dish the person never
            // chose, which is worse than losing a marker. §B's survival
            // guarantee is about REGENERATE (see the stream route), which is a
            // different act from asking for this night to change.
            pickedRecipeId: null,
            // The old recipe no longer matches this changed meal — drop it and
            // mark the slot for re-hydration. toSlotValues does NOT carry
            // recipeId, so without this a modified slot would keep a stale
            // recipe. The old plan_generated recipe orphans and cascades away
            // with the plan. See decisions.md "Phase 1D Groceries architecture".
            recipeId: null,
            recipeStatus: "stale" as const,
          };

      const existing = slotByDate.get(meal.date);
      if (existing) {
        await tx
          .update(mealPlanSlots)
          .set({
            mealType: "dinner",
            ...toSlotValues(meal),
            ...recipeLink,
            feedback: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mealPlanSlots.id, existing.id),
              eq(mealPlanSlots.householdId, householdId)
            )
          );
      } else {
        await tx.insert(mealPlanSlots).values({
          householdId,
          planId: plan.id,
          mealType: "dinner",
          ...toSlotValues(meal),
          ...recipeLink,
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
          estCostCents: null,
          chips: [],
          rationale: null,
          recipeId: null,
          pickedRecipeId: null,
          // Non-cookable slots skip hydration — reset to "none", not "stale".
          recipeStatus: "none",
          feedback: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mealPlanSlots.id, existing.id),
            eq(mealPlanSlots.householdId, householdId)
          )
        );
    }
  });

  const rows = await db
    .select()
    .from(mealPlanSlots)
    .where(
      and(
        eq(mealPlanSlots.planId, plan.id),
        eq(mealPlanSlots.householdId, householdId)
      )
    )
    .orderBy(mealPlanSlots.date, mealPlanSlots.mealType);

  // Same shape `plan.current` returns — the client writes this result straight
  // into that cache, so a thinner shape here would blank the scaling line on
  // exactly the beat a pick lands.
  const updatedSlots = await withPickedServings(db, householdId, rows);

  return {
    chefResponse: validated.chefResponse,
    // The days this change touched — the client highlights these rows and, for
    // whole-week requests, scrolls to the first one so the change is never
    // silent. Both edited and removed days count as "changed."
    changedDates: [
      ...validated.changedMeals.map((m) => m.date),
      ...validated.removedDates,
    ],
    plan: { ...plan, slots: updatedSlots },
  };
}
