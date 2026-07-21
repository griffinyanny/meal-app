// The cooked-signal harvest. A recipe is "cooked" when it is the recipe of a
// confirmed plan slot whose date has already passed (decision: Griffin, S26 —
// fully automatic, no "I cooked it" tap). This stamps recipes.lastCookedAt
// durably so the Recipes tab's Cooked tier has a real data source.
//
// Why lazy-on-read (called from recipe.list) rather than at plan.confirm: at
// confirm time the slot dates are still in the FUTURE — the signal only exists
// once a day has passed, and there's no scheduler in V1. The write is idempotent
// and guarded: each recipe is stamped to the max past-slot date only when that is
// newer than its current lastCookedAt, so repeated loads (and the favorite/
// generate invalidations that refetch the list) write nothing once caught up.
//
// Returns the number of recipes newly stamped (0 when already up to date).
import { and, eq, isNotNull, isNull, lt, max, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/server/db/schema";
import { mealPlanSlots, mealPlans, recipes } from "@/server/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

export async function harvestCookedRecipes(
  db: Db,
  householdId: string,
  now: Date = new Date()
): Promise<number> {
  const today = now.toISOString().slice(0, 10); // 'YYYY-MM-DD' (UTC)

  // Each recipe that appears in a past, confirmed slot — with the most recent
  // such date. A recipe cooked across several past weeks stamps to its latest.
  const cooked = await db
    .select({
      recipeId: mealPlanSlots.recipeId,
      lastDate: max(mealPlanSlots.date),
    })
    .from(mealPlanSlots)
    .innerJoin(mealPlans, eq(mealPlanSlots.planId, mealPlans.id))
    .where(
      and(
        eq(mealPlans.householdId, householdId),
        eq(mealPlans.status, "confirmed"),
        isNotNull(mealPlanSlots.recipeId),
        lt(mealPlanSlots.date, today)
      )
    )
    .groupBy(mealPlanSlots.recipeId);

  let stamped = 0;
  for (const row of cooked) {
    if (!row.recipeId || !row.lastDate) continue;
    // Noon-UTC of the slot's calendar day: robust against timezone drift so the
    // card's "Cooked Jul 12" lands on the right day when formatted locally.
    const cookedAt = new Date(`${row.lastDate}T12:00:00Z`);

    // Guarded write: only stamps when this date is newer than what's stored, so
    // the harvest is idempotent across the many list refetches per session.
    // Cooking is a GRADUATION (like favoriting): detach the recipe from its plan
    // (null sourcePlanId) so cooked history survives the plan being replaced,
    // instead of cascading away as an ephemeral draft. Matches the recipes-schema
    // "nulled on graduation (favorite/cook)" contract.
    const updated = await db
      .update(recipes)
      .set({ lastCookedAt: cookedAt, sourcePlanId: null, updatedAt: new Date() })
      .where(
        and(
          eq(recipes.id, row.recipeId),
          eq(recipes.householdId, householdId),
          or(isNull(recipes.lastCookedAt), lt(recipes.lastCookedAt, cookedAt))
        )
      )
      .returning({ id: recipes.id });

    if (updated.length > 0) stamped += 1;
  }

  return stamped;
}
