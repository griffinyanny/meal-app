// Pure builders for the named Plan-tab seed states (docs/test-plan.md). No DB
// access — given "today" they produce the exact plan + slot rows. Dates use the
// app's own UTC helpers (todayISO/addDaysISO) so seeds and UI agree on the
// past/tonight/upcoming boundaries, including the known UTC-midnight edge.
import type { SlotType } from "../../../src/lib/plan-schema";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";

export type PlanState =
  | "EMPTY"
  | "DRAFT"
  | "MIDWEEK"
  | "ELAPSED_CONFIRMED"
  | "ELAPSED_DRAFT";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function weekdayName(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return WEEKDAYS[day] ?? "Day";
}

export interface SeedSlotInput {
  date: string;
  slotType: SlotType;
  title: string | null;
  description: string | null;
  ingredientPreview: string[];
  slotTags: string[];
  estTimeMinutes: number | null;
  chips: string[];
  servings: number;
  rationale: string | null;
}

export interface SeedPlanSpec {
  status: "draft" | "confirmed";
  weekStart: string;
  chefSummary: string;
  slots: SeedSlotInput[];
}

export interface SeedOptions {
  // Override a slot's chips by day-offset (from weekStart) — lets a spec plant a
  // control-token chip like "[E2E:FAIL] Surprise me" for the error path.
  chipOverrides?: Record<number, string[]>;
}

const DISHES = [
  "Salmon",
  "Chicken",
  "Tacos",
  "Chili",
  "Pasta",
  "Pizza",
  "Curry",
];

// A distinct, recognizable seeded meal per day. Titles start "Seeded " so specs
// can assert a generated plan (titles start "Fresh ") fully replaced it. Titles
// are unique within a week (weekday-named), so the AI mock's scoped title-match
// is unambiguous.
function seededSlot(
  weekStart: string,
  dayOffset: number,
  chips: string[]
): SeedSlotInput {
  const date = addDaysISO(weekStart, dayOffset);
  const day = weekdayName(date);
  const dish = DISHES[dayOffset % DISHES.length];
  return {
    date,
    slotType: "recipe",
    title: `Seeded ${day} ${dish}`,
    description: `A seeded ${dish.toLowerCase()} for ${day}.`,
    ingredientPreview: [dish.toLowerCase(), "olive oil", "garlic"],
    slotTags: ["seeded", "30 min"],
    estTimeMinutes: 30,
    chips,
    servings: 2,
    rationale: "Seeded for E2E.",
  };
}

function buildWeek(
  weekStart: string,
  status: "draft" | "confirmed",
  count: number,
  opts?: SeedOptions
): SeedPlanSpec {
  const slots = Array.from({ length: count }, (_, i) =>
    seededSlot(
      weekStart,
      i,
      opts?.chipOverrides?.[i] ?? ["Make it spicier", "Swap the protein"]
    )
  );
  return {
    status,
    weekStart,
    chefSummary: "Your seeded test week, ready to review.",
    slots,
  };
}

// Returns the plan spec for a state, or null for EMPTY (no plan row). Week
// anchors: DRAFT starts today; MIDWEEK starts 3 days ago (some past + today +
// upcoming); ELAPSED_* start 8 days ago (all 7 days already past).
export function buildSeedSpec(
  state: PlanState,
  opts?: SeedOptions
): SeedPlanSpec | null {
  const today = todayISO();
  switch (state) {
    case "EMPTY":
      return null;
    case "DRAFT":
      return buildWeek(today, "draft", 7, opts);
    case "MIDWEEK":
      return buildWeek(addDaysISO(today, -3), "confirmed", 7, opts);
    case "ELAPSED_CONFIRMED":
      return buildWeek(addDaysISO(today, -8), "confirmed", 7, opts);
    case "ELAPSED_DRAFT":
      return buildWeek(addDaysISO(today, -8), "draft", 7, opts);
  }
}
