// Pure builders for the named Plan-tab seed states (docs/test-plan.md). No DB
// access — given "today" they produce the exact plan + slot rows. Dates use the
// app's own UTC helpers (todayISO/addDaysISO) so seeds and UI agree on the
// past/tonight/upcoming boundaries, including the known UTC-midnight edge.
import type { SlotType } from "../../../src/lib/plan-schema";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";

export type PlanState =
  | "EMPTY"
  | "DRAFT"
  // 1E.5 · the rail's own states. DRAFT and CONFIRMED are genuinely different
  // screens now (§D), so a seed that only differed by a status column would no
  // longer be testing anything.
  | "CONFIRMED"
  | "PROVISIONAL"
  | "CHOSEN_DAYS"
  | "DENSE"
  | "UNCOOKED_PAST"
  // W9 · a week the person put one of their own recipes into. Seeded rather
  // than performed: the picker (W8) is not built yet, so this proves the
  // PROVENANCE half of the ledger independently of the entry point.
  | "PICKED"
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
  // 1E.5: the rail renders every meal type, and its density rule ("days are
  // containers, meals are inset rows") only shows up at two-plus meals a day —
  // so the seed has to be able to produce them. Defaults to dinner.
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  slotType: SlotType;
  title: string | null;
  description: string | null;
  ingredientPreview: string[];
  slotTags: string[];
  estTimeMinutes: number | null;
  chips: string[];
  servings: number;
  rationale: string | null;
  // W6 · what this meal adds to the shop, in cents. Null = the model declined.
  estCostCents?: number | null;
  // W9 · the person chose this night's dish out of their library. The seeder
  // creates a real library recipe and points `pickedRecipeId` at it, because
  // the column is a live FK — a fabricated uuid would insert-fail rather than
  // render, and the whole point of the state is to prove the eyebrow.
  picked?: boolean;
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
    estCostCents: 1500,
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
//
// ⚠️ RE-POINTED AT 1E.5 (S44). Two of this state's three original findings are
// now EXPECTED renderings rather than defects, so preserving it unchanged would
// have made it grade the rail against rules the rail deliberately replaced:
//
//   • the double cook time (BUG-008) is fixed by the meta-row contract — a
//     time-shaped tag is dropped, so day 0's "90 min" beside estTimeMinutes 95
//     is now proof the rule WORKS rather than proof it is broken. Kept, because
//     it is still the input that would break a naive implementation.
//   • the null-title slot (BUG-009) is no longer a "Thinking…" card; it is the
//     provisional row, which is correct by design. Kept for the same reason.
//   • the oversized chip row is GONE as a stress case — the rail carries no
//     chips at all, so there is nothing left for it to stress.
//
// What is adversarial about the NEW rules is different, so three cases replace
// it: a day dense enough that the container has to hold three rows of mixed
// type, a rationale long enough to test the one place gold body text is allowed,
// and a cost estimate at the far end of what the validator will admit.
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

  // 2 — the longest thing the chef is allowed to say, on the one row licensed
  // to say it. Gold body text is capped at three marks by law 06, so a rationale
  // that runs to four lines is where "the chef speaking" stops being a highlight
  // and starts being a paragraph. Plus a marker above the title, which is the
  // only other thing competing for the eyebrow.
  slots.push({
    ...base(2),
    rationale:
      "Wednesday is the night this week actually turns, so this one leans on " +
      "Sunday's braise and asks almost nothing of you — twenty minutes, one " +
      "pan, and the last of the herbs from Monday finished off rather than " +
      "thrown away at the weekend.",
    slotTags: ["cooks ahead", "45 min"],
    estCostCents: 19_900,
  });

  // 3-5 — three near-identical cards. If the UI leans on the title alone to
  // tell meals apart, this is where that shows.
  for (const offset of [3, 4, 5]) {
    slots.push({ ...base(offset), title: ADVERSARIAL_NEAR_DUPLICATE });
  }

  // 6 — a night out. Under the rail this is no longer a de-emphasized CARD; it
  // is a 56px line with no surface, which is the rule that replaced it.
  slots.push({
    ...base(6),
    slotType: "eating_out",
    title: null,
    description: null,
    ingredientPreview: [],
    slotTags: [],
    estTimeMinutes: null,
    chips: [],
    rationale: null,
    estCostCents: null,
  });

  // 5 also gets a second and third meal, so one day in the state is at the
  // density the container rule exists for while its neighbours are not — the
  // mixed case, which is harder to lay out than either uniform one.
  const dense = base(5);
  slots.push({
    ...dense,
    mealType: "lunch",
    title: "Leftover Gochujang Short Rib Bowls With Everything In Them",
    rationale: "A rationale a compact row must refuse to print.",
    estTimeMinutes: 12,
  });
  slots.push({
    ...dense,
    mealType: "breakfast",
    title: "Eggs",
    rationale: "The shortest title on the surface, beside the longest.",
    estTimeMinutes: null,
    estCostCents: null,
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
    case "CONFIRMED":
      // A settled week that has NOT started yet — the one seed that isolates
      // "the decision was spent" from "some of it is already in the past".
      // MIDWEEK cannot do this job: it always carries cooked days.
      return {
        ...buildWeek(today, "confirmed", 5, opts),
        chefSummary: "That's the week. Your list is ready.",
      };
    case "PROVISIONAL":
      return provisionalWeek(today, opts);
    case "CHOSEN_DAYS":
      return chosenDaysWeek(today, opts);
    case "DENSE":
      return denseWeek(today, opts);
    case "UNCOOKED_PAST":
      return uncookedPastWeek(today, opts);
    case "PICKED":
      return pickedWeek(today, opts);
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

// ── 1E.5 seed states ───────────────────────────────────────────────────────

// A week with a hole in it. The provisional slot is NOT a loading state and NOT
// an error: it is a night with no answer yet, and the rule that matters is that
// you can still confirm the week around it (BUG-009). The description carries
// the sentence the row shows in place of a title.
function provisionalWeek(today: string, opts?: SeedOptions): SeedPlanSpec {
  const week = buildWeek(today, "draft", 5, opts);
  week.slots[3] = {
    ...week.slots[3]!,
    title: null,
    description: "Friday, after Wednesday",
    rationale: null,
    ingredientPreview: [],
    slotTags: [],
    estTimeMinutes: null,
    chips: [],
    estCostCents: null,
  };
  return { ...week, chefSummary: "Four nights settled, one still open." };
}

// A WEEK IS THE DAYS YOU CHOSE (§D). Non-contiguous is the NORMAL shape, not an
// edge case — "not here Mon/Tue, want Thursday and Friday". Offsets 0, 3, 4
// leave a real gap the rail must acknowledge once at the bottom rather than
// drawing as empty rows, plus an eating-out night that is a rail line, not a card.
function chosenDaysWeek(today: string, opts?: SeedOptions): SeedPlanSpec {
  const pick = (offset: number) =>
    seededSlot(
      today,
      offset,
      opts?.chipOverrides?.[offset] ?? ["Make it spicier", "Swap the protein"]
    );
  const eatingOut: SeedSlotInput = {
    ...pick(2),
    slotType: "eating_out",
    title: null,
    description: null,
    ingredientPreview: [],
    slotTags: [],
    estTimeMinutes: null,
    chips: [],
    rationale: null,
    estCostCents: null,
  };
  return {
    status: "draft",
    weekStart: today,
    chefSummary: "Three dinners, and Tuesday you're out.",
    slots: [pick(0), eatingOut, pick(3), pick(4)],
  };
}

// Fifteen meals in the same scroll as five dinners — the density the container
// rule exists for. Only the dinners carry a rationale, which is the mechanism
// that keeps fifteen meals inside law 06's three-gold-mark budget.
function denseWeek(today: string, opts?: SeedOptions): SeedPlanSpec {
  const slots: SeedSlotInput[] = [];
  for (let day = 0; day < 5; day++) {
    const dinner = seededSlot(
      today,
      day,
      opts?.chipOverrides?.[day] ?? ["Make it spicier", "Swap the protein"]
    );
    slots.push(dinner);
    slots.push({
      ...dinner,
      mealType: "lunch",
      title: `Seeded ${weekdayName(dinner.date)} Lunch`,
      rationale: "A rationale the compact row must NOT print.",
      estTimeMinutes: 15,
      estCostCents: 700,
    });
    slots.push({
      ...dinner,
      mealType: "breakfast",
      title: `Seeded ${weekdayName(dinner.date)} Breakfast`,
      rationale: "A rationale the compact row must NOT print.",
      estTimeMinutes: 10,
      estCostCents: 400,
    });
  }
  return {
    status: "draft",
    weekStart: today,
    chefSummary: "Fifteen meals, five shops' worth of nothing wasted.",
    slots,
  };
}

// Divergence, RENDERING ONLY (Griffin, S43). A confirmed week where a planned
// night simply did not get cooked. The cascade — list repair, the leftover
// chain, whether the chef re-plans — is explicitly out of 1E.5; what has to be
// true here is only that the layout can SAY it, so a later phase isn't blocked
// by a screen that cannot express the state.
function uncookedPastWeek(today: string, opts?: SeedOptions): SeedPlanSpec {
  return {
    ...buildWeek(addDaysISO(today, -2), "confirmed", 6, opts),
    chefSummary: "Here's the rest of your week.",
  };
}

// W9 · a draft the person put one of their own recipes into.
//
// ONE picked night among six chef-proposed ones, on purpose. The ledger's rule
// is that a pick is a constraint on the chef rather than a scheduler, so the
// state worth photographing is the MIXED one — a rail where a picked row and a
// proposed row sit together and the only difference is the eyebrow. A week of
// all-picked meals would prove the eyebrow renders while hiding the thing that
// actually matters, which is that it reads as a type rather than as chrome.
//
// It is a DRAFT because §B says the chef answers a pick with a night and a
// reason, and that conversation only exists before the week is agreed.
function pickedWeek(today: string, opts?: SeedOptions): SeedPlanSpec {
  const week = buildWeek(today, "draft", 7, opts);
  return {
    ...week,
    chefSummary:
      "I built the week around the carbonara you picked — it's your recipe, " +
      "so I won't rewrite it.",
    slots: week.slots.map((slot, i) =>
      i === 1
        ? {
            ...slot,
            title: "Spaghetti alla Carbonara",
            picked: true,
            // §B: a picked meal's rationale argues PLACEMENT, not the dish.
            // The chef did not choose the food and has nothing to say about it.
            rationale:
              "Put it midweek so the guanciale gets used while it's fresh.",
          }
        : slot
    ),
  };
}
