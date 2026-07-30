// The rail's own logic (Phase 1E.5 — the decisions ledger, §D "Density, time,
// and the bottom edge"). Split from plan-helpers.ts at the 300-line rule; that
// file keeps the shared slot/date vocabulary, this one keeps everything that
// only exists because days became containers.
import {
  addDaysISO,
  type DisplayMeal,
  type MealType,
  type Timeframe,
} from "./plan-helpers";

// Dinner leads its day, then lunch, then breakfast (frames 3h/3p). This is NOT
// the DB's alphabetical `orderBy(date, mealType)`, which would put breakfast
// first — the rail sorts for reading order, not storage order.
const MEAL_TYPE_RANK: Record<MealType, number> = {
  dinner: 0,
  lunch: 1,
  breakfast: 2,
  snack: 3,
};

export function mealTypeRank(mealType: MealType): number {
  return MEAL_TYPE_RANK[mealType];
}

// Only dinner argues for its placement. This single rule is what holds the
// surface inside law 06's three-gold-marks budget at every density: fifteen
// meals still produce five gold rationales, not fifteen.
export function carriesRationale(mealType: MealType): boolean {
  return mealType === "dinner";
}

// A tag that is really a duration in disguise ("30 min", "1 hr", "45m"). The
// real model emits these alongside estTimeMinutes, which is how BUG-008 put two
// different cook times on the same card ("95 min · … · 90 min"). Nothing that
// matches this may ever reach the meta row.
const TIME_SHAPED_TAG =
  /^\s*(?:about|approx\.?|~)?\s*\d+\s*(?:m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/i;

export function isTimeShapedTag(tag: string): boolean {
  return TIME_SHAPED_TAG.test(tag);
}

// "4 hr", "20 min", "1 hr 35 min". Long cooks read as hours on the card because
// "240 min" makes the reader do arithmetic to learn it is a Sunday roast.
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

// THE META ROW IS ONE COOK TIME AND ONE SERVING COUNT (ledger §D).
//
// Tags never enter it — that is the whole of the BUG-008 fix. A tag that looks
// like a duration is dropped outright rather than deduped, because a card can
// only honestly state one cook time and `estTimeMinutes` is the structured one.
// Everything else a tag might say ("cooks ahead") is a MARKER and belongs above
// the title, where it can never be mistaken for a second duration.
//
// Frames 3i/3j draw a leftover night as "20 min · Sunday's pork". We have no
// column naming a leftover's source, and the ledger's rule is the narrower one,
// so the serving count holds the slot until Slice 2 gives the meta a real
// second fact (provenance) to carry. Don't invent the source from prose.
//
// W8 · SERVINGS ARE SAID EXACTLY ONCE (ledger §B). On a picked night the chef
// scaled the person's own recipe, and `scaled to 3` says that where `serves 3`
// would say nothing — but ONLY where a scaling actually happened. A pick the
// chef left at the recipe's own count reads `serves 3` like every other night,
// because claiming a change that did not occur is the failure mode this rule
// exists to prevent. The number itself comes from generation, never from
// arithmetic here.
export function metaLine(meal: DisplayMeal): string {
  const parts: string[] = [];
  if (meal.estTimeMinutes) parts.push(formatDuration(meal.estTimeMinutes));
  if (meal.servings) {
    const scaled =
      meal.pickedRecipeId != null &&
      meal.pickedSourceServings != null &&
      meal.pickedSourceServings !== meal.servings;
    parts.push(scaled ? `scaled to ${meal.servings}` : `serves ${meal.servings}`);
  }
  return parts.join(" · ");
}

// Non-time tags, promoted above the title. Capped at one: the eyebrow row is a
// label, not a tag cloud, and a second marker is always less informative than
// the title it is pushing down.
export function markersOf(meal: DisplayMeal): string[] {
  return meal.tags.filter((t) => !isTimeShapedTag(t)).slice(0, 1);
}

// ── Day containers ─────────────────────────────────────────────────────────
// "Days are containers; meals are inset rows." A PlanDay is one container: the
// date that labels it plus the meals inside it, in reading order.

export interface PlanDay {
  date: string;
  dayName: string;
  timeframe: Timeframe;
  meals: DisplayMeal[];
}

// Group meals into day containers.
//
// A WEEK IS THE DAYS YOU CHOSE, NEVER A CALENDAR WITH HOLES (ledger §D). Days
// with no meals are simply absent from the result — the rail renders only what
// exists, and the absence is stated once at the bottom by `unplannedSpan`.
// Seven skeleton rows for days nobody asked about reads as a rendering failure.
export function groupIntoDays(meals: DisplayMeal[]): PlanDay[] {
  const byDate = new Map<string, PlanDay>();
  for (const meal of meals) {
    if (!meal.date) continue;
    let day = byDate.get(meal.date);
    if (!day) {
      day = {
        date: meal.date,
        dayName: meal.dayName,
        timeframe: meal.timeframe,
        meals: [],
      };
      byDate.set(meal.date, day);
    }
    day.meals.push(meal);
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of days) {
    day.meals.sort((a, b) => mealTypeRank(a.mealType) - mealTypeRank(b.mealType));
  }
  return days;
}

// A day whose only meal is `eating_out` or `skip` is not a container — it is a
// 56px rail line with no surface ("You're out"). A container needs contents.
export function isAbsentDay(day: PlanDay): boolean {
  return (
    day.meals.length > 0 &&
    day.meals.every((m) => m.slotType === "eating_out" || m.slotType === "skip")
  );
}

// A slot with no answer yet — mid-generation, or deliberately undecided. Both
// render as the provisional row, because the user-facing fact is identical:
// nothing is planned here and nothing was bought for it (BUG-009).
export function isProvisional(meal: DisplayMeal): boolean {
  return (
    (meal.slotType === "recipe" || meal.slotType === "leftover") && !meal.title
  );
}

// Progress is a count of written meals, never a bar (ledger §C). A bar would
// claim a precision the model does not have; "14 of 15" is the actual state.
export function writtenCount(meals: DisplayMeal[]): { written: number; total: number } {
  const countable = meals.filter(
    (m) => m.slotType === "recipe" || m.slotType === "leftover"
  );
  return {
    written: countable.filter((m) => !!m.title).length,
    total: countable.length,
  };
}

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function shortDayName(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return SHORT_WEEKDAYS[day] ?? "";
}

export function dayOfMonth(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDate();
}

// The closing line's subject: which days of the plan's span got no meals at
// all. Returned as a human range ("Sun–Wed") so the absence can be acknowledged
// once, in words, instead of drawn as empty rows.
//
// Returns null when the chosen days cover the span — there is nothing to
// acknowledge, and a line saying so would be noise.
export function unplannedSpan(
  days: PlanDay[],
  weekStart: string,
  weekLength = 7
): string | null {
  if (days.length === 0) return null;
  const planned = new Set(days.map((d) => d.date));
  const missing: string[] = [];
  for (let i = 0; i < weekLength; i++) {
    const date = addDaysISO(weekStart, i);
    if (!planned.has(date)) missing.push(date);
  }
  if (missing.length === 0) return null;

  // Collapse runs of consecutive dates: "Sun–Wed", or "Sun–Mon, Thu".
  const runs: string[] = [];
  let runStart = missing[0]!;
  let prev = missing[0]!;
  for (const date of missing.slice(1)) {
    if (date !== addDaysISO(prev, 1)) {
      runs.push(formatRun(runStart, prev));
      runStart = date;
    }
    prev = date;
  }
  runs.push(formatRun(runStart, prev));
  return runs.join(", ");
}

function formatRun(start: string, end: string): string {
  const from = shortDayName(start);
  if (start === end) return from;
  return `${from}–${shortDayName(end)}`;
}
