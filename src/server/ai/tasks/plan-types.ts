import { TRPCError } from "@trpc/server";
import type { AIPlan, AIMeal, AIPlanModification, SlotType } from "@/lib/plan-schema";
import { absorbRepeatedMethod } from "./absorb-method";
import { dedupePickedRefs } from "./plan-picks";

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
  // W8 · a 1-based reference into the picks this generation was given, or null.
  // Still a REFERENCE at this layer: the caller resolves it against the picks it
  // sent, because only the caller knows what it sent.
  pickedRef: number | null;
}

export interface ValidatedPlan {
  chefSummary: string;
  chefNote: string | null;
  meals: ValidatedMeal[];
}

/**
 * The chef's claim is ONE sentence, enforced here rather than in the prompt.
 *
 * BUG-034: frame `3i` draws two strings at two sizes, but generation emitted one
 * field, so both of the model's sentences landed in the 22px heading and pushed
 * the first meal below the fold. Splitting the field fixes the data; this fixes
 * the guarantee, because BUG-033 established that a style clause loses to the
 * request competing with it — "one sentence" in a prompt is a preference, and
 * "one sentence" here is a fact.
 *
 * IT SPLITS, IT DOES NOT TRUNCATE. An over-long summary loses nothing: the
 * overflow becomes the argument, which is the slot it belonged in anyway. A
 * truncating ceiling would cut the chef mid-thought to protect a layout, which
 * is the failure mode this whole fix exists to avoid.
 */
export function splitChefVoice(
  rawSummary: string,
  rawNote: string | null
): { chefSummary: string; chefNote: string | null } {
  const summary = rawSummary.trim();
  const note = rawNote?.trim() || null;

  // A sentence boundary is a terminator, then whitespace, then a CAPITAL. All
  // three are load-bearing: a bare trailing "." ends the only sentence rather
  // than starting a second, "3.5 hours" fails on the whitespace, and "e.g. the
  // Sunday braise" fails on the capital — which the test found, because a
  // terminator plus a space alone cut that one in half.
  const boundary = summary.search(/[.!?]\s+(?=["'“‘]?[A-Z])/);
  if (boundary === -1) return { chefSummary: summary, chefNote: note };

  const claim = summary.slice(0, boundary + 1);
  const overflow = summary.slice(boundary + 1).trim();
  if (!overflow) return { chefSummary: summary, chefNote: note };

  return {
    chefSummary: claim,
    // The overflow leads: it is the sentence the chef wrote SECOND, so it is
    // the argument to its own claim, and it reads ahead of anything the model
    // put in chefNote independently.
    chefNote: note ? `${overflow} ${note}` : overflow,
  };
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
    // A pick is a dish the person is going to cook, so a ref on a night out or a
    // skipped night is a model error rather than a fact — dropped, not carried.
    // Range-checking happens where the picks are known (resolvePickedRecipeId);
    // here we only reject what is not a positive integer at all.
    pickedRef:
      isCookable &&
      meal.pickedRef != null &&
      Number.isInteger(meal.pickedRef) &&
      meal.pickedRef > 0
        ? meal.pickedRef
        : null,
  };
}

export function validatePlan(
  plan: AIPlan,
  ctx: ValidatePlanContext
): ValidatedPlan {
  const { chefSummary, chefNote } = splitChefVoice(
    plan.chefSummary,
    plan.chefNote
  );
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

  // W1: a method covering four or more meals is the WEEK's, not each card's.
  // Enforced here because two Layer-B rounds proved the prompt cannot hold it
  // against an explicit "I want to grill" (absorb-method.ts).
  //
  // Matched against BOTH halves of the chef's voice. Absorption only strips a
  // method the week has already stated, and the split moved most of the week's
  // stating into chefNote — reading the claim alone would have quietly turned
  // the strip off for exactly the weeks it exists for.
  const voice = chefNote ? `${chefSummary} ${chefNote}` : chefSummary;
  const deduped = dedupePickedRefs(meals);
  const absorbed = absorbRepeatedMethod(deduped, voice);

  // ABSORPTION ERASES ITS OWN EVIDENCE, which is why it has been a guarantee on
  // paper since S45. After the strip the titles simply do not open with a
  // method, and that is indistinguishable from a model that never repeated one
  // — so no amount of reading the finished week tells you whether the code ran.
  // One line, only when it actually fires, so Layer B can see the path execute
  // on a real "I want to grill" instead of inferring it from an absence.
  const stripped = absorbed.filter((m, i) => m.title !== deduped[i]?.title);
  if (stripped.length > 0) {
    console.log(
      `[plan] absorbed a repeated method from ${stripped.length} titles:`,
      stripped.map((m) => m.title).join(" | ")
    );
  }

  return { chefSummary, chefNote, meals: absorbed };
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
    changedMeals: dedupePickedRefs(changedMeals),
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
