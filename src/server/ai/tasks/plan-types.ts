import { TRPCError } from "@trpc/server";
import type { AIPlan, AIMeal, AIPlanModification, SlotType } from "@/lib/plan-schema";

// Pure schemas live in @/lib/plan-schema (client-safe). This module adds the
// server-side bound-checking/sanitization that the strict-mode schema can't
// express, mirroring the recipe pipeline in ./types.ts. The AI returns
// lightweight meal CONCEPTS, not full recipes — full recipes are generated
// lazily on confirm/cook. Re-exported here for server-side convenience.
export {
  aiPlanSchema,
  aiMealSchema,
  aiPlanModificationSchema,
} from "@/lib/plan-schema";
export type { AIPlan, AIMeal, AIPlanModification } from "@/lib/plan-schema";

const DAYS_IN_WEEK = 7;
const MAX_INGREDIENT_PREVIEW = 12;
const MAX_TAGS = 6;
const MAX_CHIPS = 2;
// The outer bound on a believable per-meal grocery estimate (W6). A dinner for
// six can honestly reach $60; $200 cannot, so anything above this is a model
// error rather than an expensive meal. Out-of-range estimates are DROPPED to
// null rather than clamped: clamping would invent a number, and the whole
// guardrail set for this feature says absence beats a figure we made up.
const MAX_SLOT_COST_CENTS = 20_000;

export interface ValidatedMeal {
  date: string; // ISO YYYY-MM-DD, derived from weekStart + dayOffset
  slotType: SlotType;
  title: string | null;
  description: string | null;
  rationale: string | null;
  ingredientPreview: string[];
  tags: string[];
  estTimeMinutes: number | null;
  estCostCents: number | null;
  servings: number;
  chips: string[];
}

export interface ValidatedPlan {
  chefSummary: string;
  meals: ValidatedMeal[];
}

interface ValidatePlanContext {
  weekStart: string; // ISO YYYY-MM-DD
  defaultServings: number;
}

// weekStart + offset days, UTC-safe (date-only, no timezone drift).
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function cleanStrings(values: string[], max: number): string[] {
  return values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, max);
}

// Sanitize and bound-check a single AI meal. Returns null when the day is out of
// range or a cookable slot is missing a title (unusable). The schema sent to
// OpenAI carries no min/max constraints, so the model could return nonsense.
function validateMeal(
  meal: AIMeal,
  ctx: ValidatePlanContext
): ValidatedMeal | null {
  if (
    !Number.isInteger(meal.dayOffset) ||
    meal.dayOffset < 0 ||
    meal.dayOffset >= DAYS_IN_WEEK
  ) {
    return null;
  }

  const isCookable = meal.slotType === "recipe" || meal.slotType === "leftover";
  const title = meal.title?.trim() || null;
  if (isCookable && !title) return null;

  const servings =
    meal.servings != null && meal.servings >= 1
      ? meal.servings
      : ctx.defaultServings;

  return {
    date: addDays(ctx.weekStart, meal.dayOffset),
    slotType: meal.slotType,
    title,
    description: isCookable ? meal.description?.trim() || null : null,
    rationale: meal.rationale?.trim() || null,
    ingredientPreview: isCookable
      ? cleanStrings(meal.ingredientPreview, MAX_INGREDIENT_PREVIEW)
      : [],
    tags: isCookable ? cleanStrings(meal.tags, MAX_TAGS) : [],
    estTimeMinutes:
      isCookable &&
      meal.estTimeMinutes != null &&
      Number.isFinite(meal.estTimeMinutes) &&
      meal.estTimeMinutes >= 0
        ? meal.estTimeMinutes
        : null,
    // A night you're eating out costs money too, but not money this app can
    // see, and the grocery list is what the estimate is about — so only a
    // cookable slot carries one.
    estCostCents:
      isCookable &&
      meal.estCostCents != null &&
      Number.isInteger(meal.estCostCents) &&
      meal.estCostCents > 0 &&
      meal.estCostCents <= MAX_SLOT_COST_CENTS
        ? meal.estCostCents
        : null,
    servings,
    chips: isCookable ? cleanStrings(meal.chips, MAX_CHIPS) : [],
  };
}

export function validatePlan(
  plan: AIPlan,
  ctx: ValidatePlanContext
): ValidatedPlan {
  const chefSummary = plan.chefSummary.trim();
  const seenDays = new Set<number>();
  const meals: ValidatedMeal[] = [];

  for (const meal of plan.meals) {
    if (seenDays.has(meal.dayOffset)) continue;
    const validated = validateMeal(meal, ctx);
    if (!validated) continue;
    seenDays.add(meal.dayOffset);
    meals.push(validated);
  }

  if (!chefSummary || meals.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The chef couldn't put together a plan. Please try again.",
    });
  }

  meals.sort((a, b) => a.date.localeCompare(b.date));

  return { chefSummary, meals };
}

export interface ValidatedModification {
  chefResponse: string;
  changedMeals: ValidatedMeal[];
  removedDates: string[];
}

// Validates a modification diff: sanitizes changed meals (deduped by day) and
// maps removed day offsets to dates. Out-of-range / unusable changes are dropped.
export function validateModification(
  mod: AIPlanModification,
  ctx: ValidatePlanContext
): ValidatedModification {
  const seenDays = new Set<number>();
  const changedMeals: ValidatedMeal[] = [];

  for (const meal of mod.changedMeals) {
    if (seenDays.has(meal.dayOffset)) continue;
    const validated = validateMeal(meal, ctx);
    if (!validated) continue;
    seenDays.add(meal.dayOffset);
    changedMeals.push(validated);
  }

  const removedDates = mod.removedDayOffsets
    .filter(
      (offset) =>
        Number.isInteger(offset) && offset >= 0 && offset < DAYS_IN_WEEK
    )
    .map((offset) => addDays(ctx.weekStart, offset));

  return {
    chefResponse: mod.chefResponse.trim(),
    changedMeals,
    removedDates,
  };
}

// Shape for inserting a validated meal into meal_plan_slots. The caller adds
// planId, householdId, and mealType ("dinner" in V1).
export function toSlotValues(meal: ValidatedMeal) {
  return {
    date: meal.date,
    slotType: meal.slotType,
    title: meal.title,
    description: meal.description,
    ingredientPreview: meal.ingredientPreview,
    slotTags: meal.tags,
    estTimeMinutes: meal.estTimeMinutes,
    estCostCents: meal.estCostCents,
    chips: meal.chips,
    servings: meal.servings,
    rationale: meal.rationale,
  };
}
