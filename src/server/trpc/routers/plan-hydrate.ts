// Background hydration orchestration (Phase 1D). Turns a lightweight plan slot
// (the "meal concept" produced at plan time) into a real `recipes` row and links
// it to the slot. Extracted from the plan router so the router stays thin and
// this logic — the idempotency and race-safety that matter most — is unit
// testable without tRPC ceremony. See decisions.md "Phase 1D Groceries" (2026-07-20).
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/server/db";
import { mealPlanSlots, recipes } from "@/server/db/schema";
import { getChefContext } from "@/server/ai/memory";
import { generateRecipe } from "@/server/ai/tasks/generate-recipe";
import { toDbIngredients, toDbSteps } from "@/server/ai/tasks/types";

type Db = ReturnType<typeof getDb>;
type Slot = typeof mealPlanSlots.$inferSelect;
// The DB enum is the source of truth for the slot's recipe lifecycle.
type RecipeStatus = Slot["recipeStatus"];

export interface HydrateSlotResult {
  slotId: string;
  recipeId: string | null;
  recipeStatus: RecipeStatus;
}

interface HydrateSlotArgs {
  db: Db;
  householdId: string;
  userId: string;
  slotId: string;
}

// A slot is cookable (worth a full recipe) when it's a real dish or a leftover.
// eating_out / skip slots have nothing to hydrate.
function slotIsCookable(slotType: Slot["slotType"]): boolean {
  return slotType === "recipe" || slotType === "leftover";
}

// Turn a lightweight plan slot into a faithful full-recipe prompt. The goal is a
// recipe that matches the concept the user reviewed — same dish, servings, and
// rough time — not a fresh reinterpretation.
export function buildHydrationPrompt(slot: Slot): string {
  const preview = (slot.ingredientPreview ?? []).filter(Boolean);
  const parts = [
    `Write the full recipe for this planned dinner: "${slot.title ?? "dinner"}".`,
    slot.description ? `Concept: ${slot.description}.` : null,
    slot.rationale ? `Why it's on the plan: ${slot.rationale}.` : null,
    preview.length ? `Planned around: ${preview.join(", ")}.` : null,
    `Serves ${slot.servings ?? 2}.`,
    slot.estTimeMinutes
      ? `Aim for about ${slot.estTimeMinutes} minutes total.`
      : null,
    `Stay faithful to this concept — same dish, same spirit.`,
  ];
  return parts.filter(Boolean).join(" ");
}

// Hydrate one slot. Idempotent and race-safe so a re-mount, a double-tap, or a
// second open tab can't double-generate. Returns the resulting link state.
export async function hydrateSlotRecipe({
  db,
  householdId,
  userId,
  slotId,
}: HydrateSlotArgs): Promise<HydrateSlotResult> {
  const slot = await db.query.mealPlanSlots.findFirst({
    where: and(
      eq(mealPlanSlots.id, slotId),
      eq(mealPlanSlots.householdId, householdId)
    ),
  });

  if (!slot) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  // Non-cookable slot → nothing to write. Report state so the walker skips it.
  if (!slotIsCookable(slot.slotType)) {
    return {
      slotId: slot.id,
      recipeId: slot.recipeId,
      recipeStatus: slot.recipeStatus,
    };
  }

  // Already hydrated → idempotent no-op (safe on re-mount / double-fire).
  if (slot.recipeStatus === "ready" && slot.recipeId) {
    return { slotId: slot.id, recipeId: slot.recipeId, recipeStatus: "ready" };
  }

  // Atomic claim none|stale → hydrating. The status column IS the CAS token: a
  // concurrent claim re-checks the WHERE against the just-committed row and
  // matches 0, so only one caller generates. (Deliberately NOT guarding on
  // updatedAt — defaultNow() rows carry sub-millisecond precision that truncates
  // when read into JS, so an equality guard would never match.)
  const claimed = await db
    .update(mealPlanSlots)
    .set({ recipeStatus: "hydrating", updatedAt: new Date() })
    .where(
      and(
        eq(mealPlanSlots.id, slot.id),
        eq(mealPlanSlots.householdId, householdId),
        inArray(mealPlanSlots.recipeStatus, ["none", "stale"])
      )
    )
    .returning({ id: mealPlanSlots.id });

  if (claimed.length === 0) {
    // Someone else claimed it (another walker/tab) — return the live state.
    const fresh = await db.query.mealPlanSlots.findFirst({
      where: and(
        eq(mealPlanSlots.id, slot.id),
        eq(mealPlanSlots.householdId, householdId)
      ),
    });
    return {
      slotId: slot.id,
      recipeId: fresh?.recipeId ?? null,
      recipeStatus: fresh?.recipeStatus ?? slot.recipeStatus,
    };
  }

  // Generate the full recipe (reuses the 1B recipe task). Failure is non-fatal:
  // release the claim back to "none" so a later walk can retry, then surface the
  // error (the client falls back to preview pills).
  const prompt = buildHydrationPrompt(slot);
  let aiRecipe;
  try {
    const chef = await getChefContext(db, householdId, userId);
    aiRecipe = await generateRecipe({ prompt, ...chef });
  } catch (error) {
    await db
      .update(mealPlanSlots)
      .set({ recipeStatus: "none", updatedAt: new Date() })
      .where(
        and(
          eq(mealPlanSlots.id, slot.id),
          eq(mealPlanSlots.householdId, householdId),
          eq(mealPlanSlots.recipeStatus, "hydrating")
        )
      );
    throw error;
  }

  const [recipe] = await db
    .insert(recipes)
    .values({
      householdId,
      title: aiRecipe.title,
      description: aiRecipe.description,
      servings: aiRecipe.servings,
      prepTimeMinutes: aiRecipe.prepTimeMinutes,
      cookTimeMinutes: aiRecipe.cookTimeMinutes,
      totalTimeMinutes: aiRecipe.totalTimeMinutes,
      sourceType: "plan_generated",
      sourcePlanId: slot.planId,
      ingredients: toDbIngredients(aiRecipe.ingredients),
      steps: toDbSteps(aiRecipe.steps),
      tags: aiRecipe.tags,
      generationPrompt: prompt,
    })
    .returning();

  // Conditional link: only attach if the slot is STILL "hydrating". If a modify
  // set it "stale" mid-generate, this recipe orphans (harmless — it carries
  // sourcePlanId and cascades away with the plan) and the slot re-hydrates on
  // the next walk.
  const linked = await db
    .update(mealPlanSlots)
    .set({ recipeId: recipe.id, recipeStatus: "ready", updatedAt: new Date() })
    .where(
      and(
        eq(mealPlanSlots.id, slot.id),
        eq(mealPlanSlots.householdId, householdId),
        eq(mealPlanSlots.recipeStatus, "hydrating")
      )
    )
    .returning({ id: mealPlanSlots.id });

  if (linked.length === 0) {
    return { slotId: slot.id, recipeId: null, recipeStatus: "stale" };
  }

  return { slotId: slot.id, recipeId: recipe.id, recipeStatus: "ready" };
}
