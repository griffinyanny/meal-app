import type { SlotType } from "@/lib/plan-schema";

export type Timeframe = "past" | "tonight" | "upcoming";

// Lifecycle of a slot's full (hydrated) recipe. Mirrors the DB enum on
// meal_plan_slots.recipeStatus. See decisions.md "Phase 1D Groceries" (2026-07-20).
export type RecipeStatus = "none" | "hydrating" | "ready" | "stale";

// Client-side view of a slot's hydration, for the card indicator. Folds "queued"
// and "in progress" into one "writing" (every pending recipe shimmers until it
// lands) and adds a session-local "failed". Produced by usePlanHydration.
export type HydrationView = "idle" | "writing" | "ready" | "failed";

// A normalized meal for rendering, derived from either a persisted DB slot or a
// streamed partial AI meal. Streamed meals have no id/date/feedback yet.
export interface DisplayMeal {
  id?: string;
  date?: string;
  dayName: string;
  relative: string | null; // "TONIGHT", "TODAY", or null
  timeframe: Timeframe;
  slotType: SlotType;
  title: string | null;
  description: string | null;
  rationale: string | null;
  ingredientPreview: string[];
  tags: string[];
  estTimeMinutes: number | null;
  servings: number | null;
  chips: string[];
  feedback: "thumbs_up" | "thumbs_down" | null;
  // Background hydration: the linked full recipe (once ready) and its lifecycle.
  recipeId: string | null;
  recipeStatus: RecipeStatus;
}

export interface PlanSlot {
  id: string;
  date: string;
  slotType: SlotType;
  title: string | null;
  description: string | null;
  ingredientPreview: string[] | null;
  slotTags: string[] | null;
  estTimeMinutes: number | null;
  chips: string[] | null;
  servings: number | null;
  rationale: string | null;
  feedback: "thumbs_up" | "thumbs_down" | null;
  recipeId: string | null;
  recipeStatus: RecipeStatus;
}

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// The plan's start date (today, UTC) — mirrors the server's planStartDate so the
// streaming preview labels days correctly before real dates exist.
export function weekStartISO(): string {
  return todayISO();
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayName(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return WEEKDAYS[day] ?? "";
}

export function timeframeOf(isoDate: string): Timeframe {
  const today = todayISO();
  if (isoDate < today) return "past";
  if (isoDate === today) return "tonight";
  return "upcoming";
}

function relativeLabel(timeframe: Timeframe): string | null {
  if (timeframe === "tonight") return "TONIGHT";
  return null;
}

export function slotToDisplayMeal(slot: PlanSlot): DisplayMeal {
  const timeframe = timeframeOf(slot.date);
  return {
    id: slot.id,
    date: slot.date,
    dayName: weekdayName(slot.date),
    relative: relativeLabel(timeframe),
    timeframe,
    slotType: slot.slotType,
    title: slot.title,
    description: slot.description,
    rationale: slot.rationale,
    ingredientPreview: slot.ingredientPreview ?? [],
    tags: slot.slotTags ?? [],
    estTimeMinutes: slot.estTimeMinutes,
    servings: slot.servings,
    chips: slot.chips ?? [],
    feedback: slot.feedback,
    recipeId: slot.recipeId,
    recipeStatus: slot.recipeStatus,
  };
}

// Matches the deep-partial shape useObject emits as the plan streams in.
export interface StreamedMealLike {
  dayOffset?: number;
  slotType?: SlotType;
  title?: string | null;
  description?: string | null;
  rationale?: string | null;
  ingredientPreview?: (string | undefined)[];
  tags?: (string | undefined)[];
  estTimeMinutes?: number | null;
  servings?: number | null;
  chips?: (string | undefined)[];
}

// Streamed meals arrive partial (fields fill in over time) and carry a dayOffset
// rather than a date. Returns null until a usable dayOffset is present.
export function streamedMealToDisplay(
  meal: StreamedMealLike | undefined,
  weekStart: string
): DisplayMeal | null {
  if (!meal || typeof meal.dayOffset !== "number") return null;
  const date = addDaysISO(weekStart, meal.dayOffset);
  const timeframe = timeframeOf(date);
  const slotType = meal.slotType ?? "recipe";
  return {
    date,
    dayName: weekdayName(date),
    relative: relativeLabel(timeframe),
    timeframe,
    slotType,
    title: meal.title ?? null,
    description: meal.description ?? null,
    rationale: meal.rationale ?? null,
    ingredientPreview: (meal.ingredientPreview ?? []).filter(
      (s): s is string => typeof s === "string"
    ),
    tags: (meal.tags ?? []).filter((s): s is string => typeof s === "string"),
    estTimeMinutes: meal.estTimeMinutes ?? null,
    servings: meal.servings ?? null,
    chips: (meal.chips ?? []).filter((s): s is string => typeof s === "string"),
    feedback: null,
    recipeId: null,
    recipeStatus: "none",
  };
}

export function metaLine(meal: DisplayMeal): string {
  const parts: string[] = [];
  if (meal.estTimeMinutes) parts.push(`${meal.estTimeMinutes} min`);
  if (meal.servings) parts.push(`serves ${meal.servings}`);
  for (const tag of meal.tags) parts.push(tag);
  return parts.join(" · ");
}

export function isCookable(slotType: SlotType): boolean {
  return slotType === "recipe" || slotType === "leftover";
}

// Anchor a free-form modify request to a specific meal so the chef changes the
// right day. Both card chips and meal-scoped chat route through this — without
// it, "swap this" reaches the AI with no referent and the wrong meal changes.
export function scopedRequest(text: string, meal: DisplayMeal): string {
  return `${text} — for ${meal.dayName.toLowerCase()}'s ${meal.title ?? "dinner"}.`;
}

// dayName is stored ALL-CAPS for the card eyebrow labels ("TUESDAY"); user-
// facing prose needs the proper noun ("Tuesday").
export function dayTitle(dayName: string): string {
  return dayName.charAt(0) + dayName.slice(1).toLowerCase();
}

// The chef-voice line shown in the in-place pending state while a modify runs.
// Day-level contextual (always correct) rather than parsing the free-text
// request — a scoped change names its day; a whole-week change stays general.
export function workingLabel(scope: DisplayMeal | null): string {
  if (!scope) return "Reworking your week…";
  return `Reworking ${dayTitle(scope.dayName)}'s dinner…`;
}

// True when every day in a plan is already in the past — the week has fully
// elapsed. Such a plan should invite a fresh week rather than render as an
// adjustable mid-week view (which reads as nonsensical once nothing's ahead).
export function isPlanElapsed(meals: DisplayMeal[]): boolean {
  return meals.length > 0 && meals.every((m) => m.timeframe === "past");
}
