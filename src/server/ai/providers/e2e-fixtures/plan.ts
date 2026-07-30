// Plan-domain fixtures for the E2E AI mock: whole-week generation and the
// modify pipeline (scoped chip, whole-week request, eating-out removal).
//
// Exported constants are imported by the Playwright specs too, so the expected
// strings live in ONE place and can never drift from what the mock returns.
import type { AIPlan, AIMeal, AIPlanModification } from "@/lib/plan-schema";
import { extractBlock, WEEKDAYS } from "./shared";

// Title prefix used by every generated meal. Specs assert on this to prove a
// freshly generated plan fully replaced a seeded one (whose titles start
// "Seeded"). Keep the two prefixes disjoint.
export const FRESH_TITLE_PREFIX = "Fresh";
export const REWORKED_TITLE_PREFIX = "Reworked";

const FRESH_DISHES = [
  "Sheet-Pan Salmon",
  "Chicken Stir-Fry",
  "Veggie Tacos",
  "Beef Chili",
  "Shrimp Pasta",
  "Margherita Pizza",
  "Lentil Curry",
];

function freshMeal(dayOffset: number): AIMeal {
  const dish = FRESH_DISHES[dayOffset] ?? "Dinner";
  return {
    dayOffset,
    slotType: "recipe",
    title: `${FRESH_TITLE_PREFIX} ${dish}`,
    description: `A fresh take on ${dish.toLowerCase()} from your test chef.`,
    rationale: "Balanced and quick for a weeknight.",
    ingredientPreview: ["olive oil", "garlic", "seasonal veg"],
    tags: ["30 min"],
    estTimeMinutes: 30,
    // The real model now returns a per-meal grocery estimate (W6), so the mock
    // does too — a fixture that omits it would make the cost row green against
    // a shape the live pipeline no longer produces.
    estCostCents: 1400,
    // The picker (W8) writes provenance server-side from a resolved ref, so the
    // mock's own meals are never picks — an unasked-for PICKED eyebrow in the
    // seeded suite would make L2 (provenance that varies) pass on a lie.
    pickedRef: null,
    servings: 2,
    chips: ["Make it vegetarian", "Swap the protein"],
  };
}

// The canned plan every generation returns. 7 dinners, offsets 0-6, all titled
// "Fresh …". The chef summary is a stable anchor for the review hero.
export const GENERATION_CHEF_SUMMARY =
  "A fresh, balanced week from your test chef.";

// The argument half (BUG-034). The fixture emits BOTH strings because the real
// model now does — a fixture that returned only the claim would leave the gold
// slot empty in every mock capture and hide any regression in the field the fix
// exists to fill.
export const GENERATION_CHEF_NOTE =
  "Built around one shop, with the shorter nights kept for midweek.";

/**
 * A generated week — and, when the request carried picks, a week built around
 * them (W8).
 *
 * This takes the prompt now, where it used to take nothing. That is what makes
 * §B's "picks survive a regenerate" testable at all: the guarantee is that a
 * re-roll re-pins the person's own recipes, and a fixture blind to the picks
 * block would answer every regenerate with seven chef-written dinners and make
 * the spec green on the exact behaviour the guarantee forbids.
 */
export function buildGenerationFixture(promptText = ""): AIPlan {
  const pickTitles = extractPickTitles(promptText);
  const meals = Array.from({ length: 7 }, (_, i) => freshMeal(i));

  // Picks take the first nights, so a spec can name where to look without the
  // fixture having to make a judgement it has no basis for.
  pickTitles.forEach((title, i) => {
    if (i < meals.length) meals[i] = pickedMeal(title, i + 1, i);
  });

  return {
    chefSummary: GENERATION_CHEF_SUMMARY,
    chefNote: GENERATION_CHEF_NOTE,
    meals,
  };
}

// Chef sentence for a whole-week ("lighter") modify — drives the M4 ack pill.
export const WHOLE_WEEK_CHEF_RESPONSE = "I lightened up two dinners this week.";
export const SCOPED_CHEF_RESPONSE = "Swapped in something new for that day.";
export const EATING_OUT_CHEF_RESPONSE = "Got it — I'll mark that night as eating out.";

function reworkedMeal(dayOffset: number, originalTitle: string | null): AIMeal {
  const base = (originalTitle ?? "dinner").replace(/^Seeded /, "");
  return {
    dayOffset,
    slotType: "recipe",
    title: `${REWORKED_TITLE_PREFIX} ${base}`,
    description: "A reworked dinner from your test chef.",
    rationale: "Adjusted to match your request.",
    ingredientPreview: ["fresh herbs", "lemon", "greens"],
    tags: ["light", "25 min"],
    estTimeMinutes: 25,
    estCostCents: 1100,
    pickedRef: null,
    servings: 2,
    chips: ["Make it heartier", "Swap the protein"],
  };
}

// ── W8 · the picker ────────────────────────────────────────────────────────
// The night the mock chef gives a pick WHEN NOBODY NAMED ONE. Offset 4 exists in
// every seeded week (DRAFT is seven days, CONFIRMED five), and it is not offset
// 1 or 3 — which the whole-week modify path reworks — so a pick and a modify can
// be asserted in the same week without either standing on the other.
//
// When the request DOES name a night (`3e`, opened from a meal), the mock obeys
// it. A fixture that always chose its own night would make the specs green while
// the primary that promised "Put it on Thursday" quietly put it somewhere else —
// which is the exact class of defect a mock is supposed to catch.
export const PICK_DAY_OFFSET = 4;
export const PICK_CHEF_RESPONSE =
  "Put it midweek — it's your recipe, so I won't rewrite it.";
export const PICK_RATIONALE = "The one night with room to do it properly.";

// Titles arrive as `[1] Spaghetti alla Carbonara (40 min, the recipe serves 4)`.
function extractPickTitles(promptText: string): string[] {
  const block = extractBlock(promptText, "picked_recipes");
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.match(/^\[\d+\]\s*(.+?)(?:\s*\([^)]*\))?\s*$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1].trim());
}

/**
 * The chef's answer to a pick: the person's recipe, on a night the chef chose.
 *
 * KEEPS THE TITLE EXACTLY (ledger §B, "I won't rewrite it"). The mock echoing
 * the title back verbatim is the whole point — a fixture that invented its own
 * name would make the specs green against precisely the behaviour §B forbids.
 */
function pickedMeal(title: string, ref: number, dayOffset: number): AIMeal {
  return {
    dayOffset,
    slotType: "recipe",
    title,
    description: "Your own recipe, worked into the week.",
    // §B: a picked meal's rationale argues PLACEMENT, not the dish.
    rationale: PICK_RATIONALE,
    ingredientPreview: ["from your recipe"],
    tags: ["40 min"],
    estTimeMinutes: 40,
    estCostCents: 1800,
    pickedRef: ref,
    // Build dependency 2: the SCALED count, chosen by generation. The seeded
    // library recipe serves 4 and the test household cooks for 2, so a slot that
    // still said 4 would prove nothing about scaling.
    servings: 2,
    chips: ["Make it heartier", "Swap the sides"],
  };
}

interface PlanLine {
  dayOffset: number;
  title: string;
}

// The modify task embeds <current_plan> (lines "Day N: Title") and <user_request>.
function extractPlanLines(promptText: string): PlanLine[] {
  const block = extractBlock(promptText, "current_plan");
  if (!block) return [];
  const lines: PlanLine[] = [];
  for (const raw of block.split("\n")) {
    const m = raw.match(/^Day (\d+):\s*(.+)$/);
    if (m) lines.push({ dayOffset: Number(m[1]), title: m[2].trim() });
  }
  return lines;
}

// (targetWeekday - todayWeekday) mod 7 — the offset of the next occurrence of a
// named weekday within a plan whose weekStart is today (UTC). Only used for the
// "eating out {day}" path, which has no title to anchor on. Documented coupling:
// assumes weekStart === today, which holds for the DRAFT seed state.
function offsetOfDayName(dayName: string): number | null {
  const idx = WEEKDAYS.indexOf(dayName.toUpperCase());
  if (idx < 0) return null;
  const todayIdx = new Date().getUTCDay();
  return (idx - todayIdx + 7) % 7;
}

function findDayNameInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const day of WEEKDAYS) {
    if (lower.includes(day.toLowerCase())) return day;
  }
  return null;
}

// Routes a modify request to a deterministic modification fixture. Order:
//  0. a <picked_recipes> block is present → place the picks (W8)
//  1. "eating out" → remove the named day (or first upcoming if unnamed)
//  2. a plan title appears in the request (scoped chip / meal chat) → rework it
//  3. otherwise (whole-week request) → rework two mid-week days
export function buildModificationFixture(promptText: string): AIPlanModification {
  const request = extractBlock(promptText, "user_request") ?? promptText;
  const planLines = extractPlanLines(promptText);

  // Picks first: the block's presence is unambiguous, and a pick request also
  // contains recipe titles that could otherwise fall through to the scoped
  // rework branch and quietly rewrite the recipe instead of placing it.
  const pickTitles = extractPickTitles(promptText);
  if (pickTitles.length > 0) {
    // "Put X on Day 3, replacing what's planned there" — the person named it.
    const named = request.match(/on Day (\d+)/);
    const first = named ? Number(named[1]) : PICK_DAY_OFFSET;
    return {
      chefResponse: PICK_CHEF_RESPONSE,
      changedMeals: pickTitles.map((title, i) =>
        pickedMeal(title, i + 1, first + i)
      ),
      removedDayOffsets: [],
    };
  }

  if (/eating out/i.test(request)) {
    const dayName = findDayNameInText(request);
    const offset = dayName ? offsetOfDayName(dayName) : null;
    const removed = offset != null ? offset : 2;
    return {
      chefResponse: EATING_OUT_CHEF_RESPONSE,
      changedMeals: [],
      removedDayOffsets: [removed],
    };
  }

  const matched = planLines.find(
    (l) => l.title.length > 0 && request.includes(l.title)
  );
  if (matched) {
    return {
      chefResponse: SCOPED_CHEF_RESPONSE,
      changedMeals: [reworkedMeal(matched.dayOffset, matched.title)],
      removedDayOffsets: [],
    };
  }

  // Whole-week: rework offsets 1 and 3 (both exist in every seeded week).
  const line1 = planLines.find((l) => l.dayOffset === 1);
  const line3 = planLines.find((l) => l.dayOffset === 3);
  return {
    chefResponse: WHOLE_WEEK_CHEF_RESPONSE,
    changedMeals: [
      reworkedMeal(1, line1?.title ?? null),
      reworkedMeal(3, line3?.title ?? null),
    ],
    removedDayOffsets: [],
  };
}
