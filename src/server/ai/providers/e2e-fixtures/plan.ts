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
    servings: 2,
    chips: ["Make it vegetarian", "Swap the protein"],
  };
}

// The canned plan every generation returns. 7 dinners, offsets 0-6, all titled
// "Fresh …". The chef summary is a stable anchor for the review hero.
export const GENERATION_CHEF_SUMMARY =
  "A fresh, balanced week from your test chef.";

export function buildGenerationFixture(): AIPlan {
  return {
    chefSummary: GENERATION_CHEF_SUMMARY,
    meals: Array.from({ length: 7 }, (_, i) => freshMeal(i)),
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
    servings: 2,
    chips: ["Make it heartier", "Swap the protein"],
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
//  1. "eating out" → remove the named day (or first upcoming if unnamed)
//  2. a plan title appears in the request (scoped chip / meal chat) → rework it
//  3. otherwise (whole-week request) → rework two mid-week days
export function buildModificationFixture(promptText: string): AIPlanModification {
  const request = extractBlock(promptText, "user_request") ?? promptText;
  const planLines = extractPlanLines(promptText);

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
