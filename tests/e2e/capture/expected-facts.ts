// App-specific (meal-app): the Plan-tab capture states + their ground-truth
// facts. This is the only per-app file in the capture layer; capture-runtime.ts
// and the config are generic. Facts describe what SHOULD be visibly true in each
// screenshot — the critique verifies them (correctness), which anchors the
// vision judgment. Copy strings verified against the components.
import { type Page } from "@playwright/test";
import { seedPlanState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

// The debug-HUD section the Plan tab publishes (useDebugPanel("plan", ...)).
export const PLAN_SECTION_KEY = "plan";

function gotoPlan(page: Page): Promise<void> {
  return page.goto("/plan").then(() => {});
}

// The 5 deterministic seed states (Layer A). All are seed → /plan, no interaction.
export const LAYER_A_STATES: CaptureStateDef[] = [
  {
    id: "empty-intent",
    briefRef: "brief-plan-states.md#State-3 (No-Plan input-led)",
    expectedState: "empty",
    readyText: "What are you thinking this week?",
    facts: {
      heroCopy: "What are you thinking this week?",
      hasSuggestionPills: true,
      hasTextarea: true,
      hasLetChefFigureItOut: true,
      slotCount: 0,
    },
    prepare: () => seedPlanState("EMPTY"),
    navigate: gotoPlan,
  },
  {
    id: "review-draft",
    briefRef: "brief-plan-states.md#State-1 (Weekly Review)",
    expectedState: "review",
    readyText: "Your week, ready to review",
    facts: {
      heroCopy: "Your week, ready to review",
      slotCount: 7,
      slotTitlePrefix: "Seeded",
      hasChefSummary: true,
      hasLooksGood: true,
      hasTalkToChef: true,
      hasStartOver: true,
    },
    prepare: () => seedPlanState("DRAFT"),
    navigate: gotoPlan,
  },
  {
    id: "midweek",
    briefRef: "brief-plan-states.md#State-6 (Mid-week evening)",
    expectedState: "midweek",
    readyText: "EARLIER THIS WEEK",
    facts: {
      hasTonightHeroCard: true,
      sectionLabels: ["EARLIER THIS WEEK", "COMING UP"],
      hasTalkToChef: true,
      hasPlanANewWeek: true,
    },
    prepare: () => seedPlanState("MIDWEEK"),
    navigate: gotoPlan,
  },
  {
    id: "elapsed-confirmed",
    briefRef: "week-wrapped (confirmed)",
    expectedState: "elapsed",
    readyText: "That's a wrap on this week.",
    facts: {
      heroCopy: "That's a wrap on this week.",
      subCopy: "You cooked 7 dinners. How'd they land?",
      recapLabel: "HOW'D IT GO",
      hasThumbsRecap: true,
      primaryCta: "Plan next week →",
    },
    prepare: () => seedPlanState("ELAPSED_CONFIRMED"),
    navigate: gotoPlan,
  },
  {
    id: "elapsed-draft",
    briefRef: "week-wrapped (stale draft)",
    expectedState: "elapsed",
    readyText: "This plan's gone stale.",
    facts: {
      heroCopy: "This plan's gone stale.",
      subCopy: "Those days have passed. Let's start a fresh week.",
      hasThumbsRecap: false,
      primaryCta: "Plan next week →",
    },
    prepare: () => seedPlanState("ELAPSED_DRAFT"),
    navigate: gotoPlan,
  },
  {
    id: "adversarial",
    briefRef: "visual-qa-rubric.md#adversarial-content",
    expectedState: "review",
    readyText: "Your week, ready to review",
    facts: {
      // Deliberately awkward content, so the layout is judged on its worst
      // realistic day rather than its best. What to look for in the pixels:
      slotCount: 7,
      hasOverlongTitle: true,
      overlongTitleIsClampedNotOverflowing: true,
      hasSlotWithNoTitleOrChips: true,
      emptySlotStillReadsAsACard: true,
      hasOverlongChipRow: true,
      chipRowWrapsOrScrollsCleanly: true,
      hasThreeNearIdenticalTitles: true,
      nearIdenticalCardsAreStillDistinguishable: true,
      hasEatingOutCard: true,
      eatingOutIsVisiblyDeEmphasized: true,
    },
    prepare: () => seedPlanState("ADVERSARIAL"),
    navigate: gotoPlan,
  },
];
