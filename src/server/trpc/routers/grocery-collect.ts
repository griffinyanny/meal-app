// Gathering a confirmed plan's recipe ingredient lines for grocery generation
// (Phase 1D). Extracted from grocery-generate.ts so that file stays under the
// 300-line rule: this module owns "collect the lines + sweep stragglers to full
// recipes," and grocery-generate.ts owns the generation state machine (the CAS
// claim, checkpointed phases, transactional replace). See decisions.md (2026-07-20)
// and BUG-004 (the review-time normalization cache read here).
import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/server/db";
import { mealPlanSlots, recipes } from "@/server/db/schema";
import { hydrateSlotRecipe } from "./plan-hydrate";
import type { NormalizedResult } from "@/server/ai/tasks/ingredient-normalize";

type Db = ReturnType<typeof getDb>;

// One recipe ingredient line with the recipe identity the AI never sees. The AI
// call gets only {index, qty, unit, item}; recipeId/title are re-attached after,
// by index, to build the aggregator's provenance. `cached` carries this line's
// normalization if its recipe was normalized during review (BUG-004) — a cache hit
// skips the AI; a null falls into the residual normalize batch at confirm.
export interface SourcedLine {
  recipeId: string;
  recipeTitle: string;
  qty: string;
  unit: string;
  item: string;
  cached: NormalizedResult | null;
}

// Safety net for a line that is somehow neither cached nor in the fresh-normalize
// result (shouldn't happen — normalizeIngredients guarantees one entry per input
// line). Confidence 0 forces the aggregator to keep it solo, so an unexpected gap
// can never wrongly merge. Mirrors reconcileNormalized's own miss fallback.
export function soloFallback(l: SourcedLine): NormalizedResult {
  return {
    index: 0,
    canonicalName: l.item.trim().toLowerCase() || "item",
    category: "other",
    canonicalUnit: l.unit.trim().toLowerCase(),
    numericQty: null,
    confidence: 0,
  };
}

// Gather every ingredient line from the plan's READY slots' recipes. Slots that
// never hydrated (failed sweep) simply don't contribute — the list is honest
// about what it could build.
export async function collectSourcedLines(
  db: Db,
  householdId: string,
  mealPlanId: string | null
): Promise<SourcedLine[]> {
  if (!mealPlanId) return [];

  const slots = await db
    .select()
    .from(mealPlanSlots)
    .where(
      and(
        eq(mealPlanSlots.planId, mealPlanId),
        eq(mealPlanSlots.householdId, householdId),
        eq(mealPlanSlots.recipeStatus, "ready")
      )
    );

  const recipeIds = slots
    .map((s) => s.recipeId)
    .filter((id): id is string => id != null);
  if (recipeIds.length === 0) return [];

  const recipeRows = await db
    .select()
    .from(recipes)
    .where(and(inArray(recipes.id, recipeIds), eq(recipes.householdId, householdId)));
  const byId = new Map(recipeRows.map((r) => [r.id, r]));

  const lines: SourcedLine[] = [];
  for (const slot of slots) {
    const recipe = slot.recipeId ? byId.get(slot.recipeId) : undefined;
    if (!recipe) continue;
    // Use the review-time cache only when it's present AND aligned 1:1 with the
    // recipe's current ingredient lines. A length mismatch (partial/stale cache)
    // drops the whole recipe to the residual normalize batch — safe, never wrong.
    const cache = recipe.normalizedIngredients;
    const cacheAligned =
      Array.isArray(cache) && cache.length === recipe.ingredients.length;
    recipe.ingredients.forEach((ing, i) => {
      lines.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        qty: ing.qty,
        unit: ing.unit,
        item: ing.item,
        cached: cacheAligned ? cache[i] : null,
      });
    });
  }
  return lines;
}

// Sweep any straggler slots (not yet "ready") to full recipes before we read
// ingredients. Best-effort: a slot that won't hydrate is skipped, not fatal —
// matching plan-time hydration's non-fatal contract. Returns how many stragglers
// existed at confirm (0 = the review-time walk had finished).
export async function sweepStragglers(
  db: Db,
  householdId: string,
  userId: string,
  mealPlanId: string | null
): Promise<number> {
  if (!mealPlanId) return 0;
  const slots = await db
    .select()
    .from(mealPlanSlots)
    .where(and(eq(mealPlanSlots.planId, mealPlanId), eq(mealPlanSlots.householdId, householdId)));

  let stragglers = 0;
  for (const slot of slots) {
    const cookable = slot.slotType === "recipe" || slot.slotType === "leftover";
    if (!cookable || slot.recipeStatus === "ready") continue;
    stragglers += 1;
    try {
      await hydrateSlotRecipe({ db, householdId, userId, slotId: slot.id });
    } catch {
      // Non-fatal: this slot just won't contribute to the list.
    }
  }
  return stragglers;
}
