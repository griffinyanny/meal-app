// The one shape a plan's slots are read in.
//
// `plan.current` and `applyPlanChange` both hand the client a plan, and the
// modify path writes its result straight into the `plan.current` cache — so if
// the two shapes diverge, the surface renders one thing on load and a different
// thing the instant a change lands. Keeping the enrichment here is what stops
// that from being possible.
import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/server/db";
import { mealPlanSlots, recipes } from "@/server/db/schema";

type Db = ReturnType<typeof getDb>;
type Slot = typeof mealPlanSlots.$inferSelect;

export type PlanSlot = Slot & {
  /**
   * What the person's OWN recipe serves — build dependency 2's other half.
   *
   * The rail says `scaled to 3` only where the chef actually scaled something,
   * and that comparison needs a number that lives on the recipe rather than the
   * slot. Read as a join instead of copied onto the slot: it is the recipe's
   * property, it moves if they edit the recipe, and a duplicate would be a
   * second copy free to go quietly stale against the first.
   */
  pickedSourceServings: number | null;
};

export async function withPickedServings(
  db: Db,
  householdId: string,
  slots: Slot[]
): Promise<PlanSlot[]> {
  const pickedIds = [
    ...new Set(
      slots.map((s) => s.pickedRecipeId).filter((id): id is string => id != null)
    ),
  ];

  if (pickedIds.length === 0) {
    return slots.map((s) => ({ ...s, pickedSourceServings: null }));
  }

  const picked = await db
    .select({ id: recipes.id, servings: recipes.servings })
    .from(recipes)
    .where(
      and(eq(recipes.householdId, householdId), inArray(recipes.id, pickedIds))
    );

  const byId = new Map(picked.map((r) => [r.id, r.servings]));

  return slots.map((s) => ({
    ...s,
    pickedSourceServings: s.pickedRecipeId
      ? (byId.get(s.pickedRecipeId) ?? null)
      : null,
  }));
}
