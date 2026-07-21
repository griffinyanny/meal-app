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
import { normalizeIngredients, type RawIngredientLine } from "@/server/ai/tasks/ingredient-normalize";
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
// by index, to build the aggregator's provenance.
interface SourcedLine {
  recipeId: string;
  recipeTitle: string;
  qty: string;
  unit: string;
  item: string;
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
    for (const ing of recipe.ingredients) {
      lines.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        qty: ing.qty,
        unit: ing.unit,
        item: ing.item,
      });
    }
  }
  return lines;
}

// Sweep any straggler slots (not yet "ready") to full recipes before we read
// ingredients. Best-effort: a slot that won't hydrate is skipped, not fatal —
// matching plan-time hydration's non-fatal contract.
async function sweepStragglers(
  db: Db,
  householdId: string,
  userId: string,
  mealPlanId: string | null
): Promise<void> {
  if (!mealPlanId) return;
  const slots = await db
    .select()
    .from(mealPlanSlots)
    .where(and(eq(mealPlanSlots.planId, mealPlanId), eq(mealPlanSlots.householdId, householdId)));

  for (const slot of slots) {
    const cookable = slot.slotType === "recipe" || slot.slotType === "leftover";
    if (!cookable || slot.recipeStatus === "ready") continue;
    try {
      await hydrateSlotRecipe({ db, householdId, userId, slotId: slot.id });
    } catch {
      // Non-fatal: this slot just won't contribute to the list.
    }
  }
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

  try {
    // Phase 1 — hydrating: finish any slots that didn't hydrate during review.
    await sweepStragglers(db, householdId, userId, list.mealPlanId);

    // Phase 2 — normalizing: one batched AI semantics call (name/category/unit).
    await setStatus(db, householdId, listId, "normalizing");
    const sourced = await collectSourcedLines(db, householdId, list.mealPlanId);
    const toNormalize: RawIngredientLine[] = sourced.map((l, i) => ({
      index: i,
      qty: l.qty,
      unit: l.unit,
      item: l.item,
    }));
    const normalized = await normalizeIngredients(toNormalize);

    // Phase 3 — aggregating: deterministic merge + arithmetic (no AI).
    await setStatus(db, householdId, listId, "aggregating");
    const normLines: NormalizedLine[] = sourced.map((l, i) => {
      const n = normalized[i];
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
