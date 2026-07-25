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
  | "ELAPSED_DRAFT"
  | "ADVERSARIAL";

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

// ── ADVERSARIAL (capture-only) ────────────────────────────────────────────
// The layout stress state. Every other seed is well-behaved by design, which
// means the pleasant case is the ONLY case Layer-A ever photographs — so a
// title that overflows its card, a missing chip row, or two near-identical
// meals rendering ambiguously can ship unseen. This state makes each of those
// deterministic rather than waiting for the real chef to produce one.
//
// Capture/visual-QA only: it is NOT a behavior-spec state. The E2E specs assert
// on stable seeded titles, and these deliberately aren't stable-looking.
const ADVERSARIAL_LONG_TITLE =
  "Slow-Braised Gochujang Short Ribs with Charred Scallion Salsa Verde, " +
  "Crispy Garlic Confit and a Whipped Sesame Labneh";

const ADVERSARIAL_NEAR_DUPLICATE = "Seeded Weeknight Chicken";

function adversarialSlots(weekStart: string): SeedSlotInput[] {
  const base = (dayOffset: number): SeedSlotInput =>
    seededSlot(weekStart, dayOffset, ["Make it spicier", "Swap the protein"]);

  const slots: SeedSlotInput[] = [];

  // 0 — a title far past any single line, with a long description behind it.
  slots.push({
    ...base(0),
    title: ADVERSARIAL_LONG_TITLE,
    description:
      "A deliberately long description that keeps going well past the point " +
      "where a two-line clamp would stop, so the card has to decide what to do " +
      "with the overflow rather than getting lucky.",
    slotTags: ["seeded", "long-title", "90 min", "make-ahead", "gluten-free"],
    estTimeMinutes: 95,
  });

  // 1 — nothing optional present: no title, no description, no chips, no tags.
  // The card must still be a card.
  slots.push({
    ...base(1),
    title: null,
    description: null,
    ingredientPreview: [],
    slotTags: [],
    estTimeMinutes: null,
    chips: [],
    rationale: null,
  });

  // 2 — chips present but empty-ish/oversized: a chip row that can't lay out on
  // one line, plus a single-character chip.
  slots.push({
    ...base(2),
    chips: [
      "Make it dramatically spicier than it already is tonight",
      "x",
      "Swap the protein",
    ],
  });

  // 3-5 — three near-identical cards. If the UI leans on the title alone to
  // tell meals apart, this is where that shows.
  for (const offset of [3, 4, 5]) {
    slots.push({ ...base(offset), title: ADVERSARIAL_NEAR_DUPLICATE });
  }

  // 6 — the de-emphasized case: eating out has no recipe content at all.
  slots.push({
    ...base(6),
    slotType: "eating_out",
    title: "Eating out",
    description: null,
    ingredientPreview: [],
    slotTags: [],
    estTimeMinutes: null,
    chips: [],
    rationale: null,
  });

  return slots;
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
    case "ADVERSARIAL":
      return {
        status: "draft",
        weekStart: today,
        chefSummary:
          "A deliberately awkward week — long titles, missing fields, and " +
          "near-identical dinners — so the layout has to hold up on its own.",
        slots: adversarialSlots(today),
      };
  }
}
