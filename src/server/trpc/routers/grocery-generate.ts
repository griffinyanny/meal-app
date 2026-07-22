// Grocery list generation orchestration (Phase 1D, Slice B). Turns a confirmed
// plan's hydrated recipes into a merged, categorized shopping list. Extracted
// from the grocery router so the state machine — the idempotent CAS claim, the
// checkpointed phases, and the transactional replace — is unit-testable without
// tRPC ceremony, mirroring plan-hydrate. See decisions.md "Phase 1D" (2026-07-20).
//
// The list is a deterministic projection:
//   list = aggregate(recipes of the confirmed plan's slots) + manual + staples.
// This runs at confirm and re-runs only on retry (mid-week resync is deferred).
// Idempotence is what makes retry safe: it replaces only sourceType "recipe"
// items, leaving any manual/staple items the user added untouched.
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/server/db";
import { groceryLists, groceryItems, mealPlanSlots, recipes } from "@/server/db/schema";
import { hydrateSlotRecipe } from "./plan-hydrate";
import {
  normalizeIngredients,
  type NormalizedResult,
  type RawIngredientLine,
} from "@/server/ai/tasks/ingredient-normalize";
import { aggregateIngredients, type NormalizedLine } from "@/server/grocery/aggregate";

type Db = ReturnType<typeof getDb>;
type List = typeof groceryLists.$inferSelect;
type GenerationStatus = List["generationStatus"];

export interface GenerateGroceryListResult {
  listId: string;
  generationStatus: GenerationStatus;
  itemCount: number;
}

interface GenerateArgs {
  db: Db;
  householdId: string;
  userId: string;
  listId: string;
}

// One recipe ingredient line with the recipe identity the AI never sees. The AI
// call gets only {index, qty, unit, item}; recipeId/title are re-attached after,
// by index, to build the aggregator's provenance. `cached` carries this line's
// normalization if its recipe was normalized during review (BUG-004) — a cache hit
// skips the AI; a null falls into the residual normalize batch at confirm.
interface SourcedLine {
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
function soloFallback(l: SourcedLine): NormalizedResult {
  return {
    index: 0,
    canonicalName: l.item.trim().toLowerCase() || "item",
    category: "other",
    canonicalUnit: l.unit.trim().toLowerCase(),
    numericQty: null,
    confidence: 0,
  };
}

async function setStatus(
  db: Db,
  householdId: string,
  listId: string,
  generationStatus: GenerationStatus,
  generationError: string | null = null
): Promise<void> {
  await db
    .update(groceryLists)
    .set({ generationStatus, generationError, updatedAt: new Date() })
    .where(and(eq(groceryLists.id, listId), eq(groceryLists.householdId, householdId)));
}

// Gather every ingredient line from the plan's READY slots' recipes. Slots that
// never hydrated (failed sweep) simply don't contribute — the list is honest
// about what it could build.
async function collectSourcedLines(
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
async function sweepStragglers(
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

// Generate (or retry) the grocery list for one draft list. Idempotent and
// race-safe: the generationStatus column is the CAS token, so a double-fire from
// a re-mounted tab can't run the pipeline twice.
export async function generateGroceryList({
  db,
  householdId,
  userId,
  listId,
}: GenerateArgs): Promise<GenerateGroceryListResult> {
  const list = await db.query.groceryLists.findFirst({
    where: and(eq(groceryLists.id, listId), eq(groceryLists.householdId, householdId)),
  });
  if (!list) throw new TRPCError({ code: "NOT_FOUND" });

  // Already built → idempotent no-op.
  if (list.generationStatus === "ready") {
    return { listId, generationStatus: "ready", itemCount: 0 };
  }

  // Atomic claim: pending|error → hydrating. A concurrent call re-checks the
  // WHERE against the just-committed row and matches 0, so only one caller runs
  // the pipeline. `error` is claimable so the retry button re-runs the projection.
  const claimed = await db
    .update(groceryLists)
    .set({ generationStatus: "hydrating", generationError: null, updatedAt: new Date() })
    .where(
      and(
        eq(groceryLists.id, listId),
        eq(groceryLists.householdId, householdId),
        inArray(groceryLists.generationStatus, ["pending", "error"])
      )
    )
    .returning({ id: groceryLists.id });

  if (claimed.length === 0) {
    // Another call is mid-generation (hydrating/normalizing/aggregating). Let the
    // tab keep polling; don't run a second pipeline.
    return { listId, generationStatus: list.generationStatus, itemCount: 0 };
  }

  const startedAt = Date.now();
  try {
    // Phase 1 — hydrating: finish any slots that didn't hydrate during review.
    // The straggler count is the early-confirm signal (BUG-004, Phase D): >0 means
    // the user confirmed before the review-time walk finished. Logged at the end so
    // we can measure how often that happens — the metric that gates whether true
    // section-by-section streaming (#2) is ever worth building.
    const stragglerCount = await sweepStragglers(db, householdId, userId, list.mealPlanId);

    // Phase 2 — normalizing: only the RESIDUAL. Recipes normalized during review
    // (BUG-004) carry a cached normalization; we AI-normalize just the misses
    // (stragglers swept above, or pre-feature recipes). A fully-reviewed week has
    // zero misses → normalizeIngredients short-circuits with NO AI call, so this is
    // near-instant. Only the residual case shows the "normalizing" phase copy.
    const sourced = await collectSourcedLines(db, householdId, list.mealPlanId);
    const misses: RawIngredientLine[] = [];
    sourced.forEach((l, i) => {
      if (!l.cached) {
        misses.push({ index: i, qty: l.qty, unit: l.unit, item: l.item });
      }
    });
    let freshNormalized: NormalizedResult[] = [];
    if (misses.length > 0) {
      await setStatus(db, householdId, listId, "normalizing");
      freshNormalized = await normalizeIngredients(misses);
    }
    const freshByIndex = new Map(freshNormalized.map((n) => [n.index, n]));

    // Phase 3 — aggregating: deterministic merge + arithmetic (no AI). Each line's
    // normalization is its review-time cache, else its freshly-normalized entry (by
    // the same global index it was queued under).
    await setStatus(db, householdId, listId, "aggregating");
    const normLines: NormalizedLine[] = sourced.map((l, i) => {
      const n = l.cached ?? freshByIndex.get(i) ?? soloFallback(l);
      return {
        rawQty: l.qty,
        rawUnit: l.unit,
        rawItem: l.item,
        canonicalName: n.canonicalName,
        canonicalUnit: n.canonicalUnit,
        category: n.category,
        numericQty: n.numericQty,
        confidence: n.confidence,
        recipeId: l.recipeId,
        recipeTitle: l.recipeTitle,
      };
    });
    const merged = aggregateIngredients(normLines);

    // Phase 4 — write + ready. Replace only recipe-sourced items so retries and
    // any manual/staple items the user added coexist. All in one transaction.
    await db.transaction(async (tx) => {
      await tx
        .delete(groceryItems)
        .where(
          and(
            eq(groceryItems.listId, listId),
            eq(groceryItems.householdId, householdId),
            eq(groceryItems.sourceType, "recipe")
          )
        );

      if (merged.length > 0) {
        await tx.insert(groceryItems).values(
          merged.map((m, i) => ({
            householdId,
            listId,
            name: m.name,
            rawName: m.rawName,
            quantity: m.quantity,
            unit: m.unit,
            category: m.category,
            sourceType: "recipe" as const,
            sourceRecipeId: m.sources[0]?.recipeId ?? null,
            sources: m.sources,
            position: i,
          }))
        );
      }

      await tx
        .update(groceryLists)
        .set({ generationStatus: "ready", generationError: null, updatedAt: new Date() })
        .where(and(eq(groceryLists.id, listId), eq(groceryLists.householdId, householdId)));
    });

    // Early-confirm instrumentation (BUG-004, Phase D). One line per confirm:
    // stragglers = recipes not yet ready at confirm (the early-confirm signal),
    // misses = lines that needed a fresh normalize (0 = fully cache-served, zero
    // AI at confirm), and the confirm→ready wall-time. This is what decides whether
    // section-by-section streaming (#2) is ever worth building.
    console.log(
      `[grocery.generate] listId=${listId} stragglers=${stragglerCount} normalizeMisses=${misses.length} items=${merged.length} confirmMs=${Date.now() - startedAt}`
    );

    return { listId, generationStatus: "ready", itemCount: merged.length };
  } catch (error) {
    // The status column IS the error channel (the tab reuses Plan's stream-error
    // card + a one-tap retry that re-claims from `error`). We record the message
    // and return rather than throw, so the failure has exactly one representation.
    const message = error instanceof Error ? error.message : String(error);
    await setStatus(db, householdId, listId, "error", message);
    return { listId, generationStatus: "error", itemCount: 0 };
  }
}
