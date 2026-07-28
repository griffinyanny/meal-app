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

// The deterministic seed states (Layer A). All are seed → /plan, no interaction.
//
// ⚠️ 1E.5 rebuilt this surface, so both halves of each entry moved: `readyText`
// used to wait on "Your week, ready to review", a hero the rail deleted, and the
// facts described cards that no longer exist. Waiting on a dead string does not
// fail loudly — it times out and the capture comes back empty, which is why
// these are updated in the same pass as the specs.
const RAIL_READY = "YOUR CHEF";
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
    briefRef: "surfaces/plan/final-direction-2.dc.html#3i (Draft)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      chefStatus: "Draft",
      slotCount: 7,
      slotTitlePrefix: "Seeded",
      daysAreContainersWithInsetRows: true,
      onlyDinnerCarriesAGoldRationale: true,
      metaRowIsOneTimeAndOneServingCount: true,
      floatingPrimary: "Confirm 7 dinners",
      consequenceLineAbovePrimary: true,
      hasStartOverFootLink: true,
      exactlyOneFloatingLayer: true,
    },
    prepare: () => seedPlanState("DRAFT"),
    navigate: gotoPlan,
  },
  {
    id: "review-confirmed",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3j (Confirmed)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // The point of this capture is what is ABSENT. A confirmed week has no
      // floating action at all — the decision was spent — and an empty bottom
      // edge is the state, not a missing control.
      chefStatus: "Set",
      hasNoFloatingAction: true,
      hasGroceryRowWhereTheArgumentWas: true,
      rowsKeepMetaButLoseRationales: true,
      slotCount: 5,
    },
    prepare: () => seedPlanState("CONFIRMED"),
    navigate: gotoPlan,
  },
  {
    id: "provisional",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3n (Provisional)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // BUG-009's resolution. A slot with no answer yet is PROVISIONAL, not
      // loading: a muted sentence where the title goes, one control, NEVER a
      // spinner — and confirm stays live over it.
      provisionalSentence: "Friday, after Wednesday",
      provisionalHasNoSpinner: true,
      provisionalHoldsItsHeight: true,
      floatingPrimary: "Confirm 4 dinners",
      slotCount: 5,
    },
    prepare: () => seedPlanState("PROVISIONAL"),
    navigate: gotoPlan,
  },
  {
    id: "chosen-days",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3o,#3p (Chosen days)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // NEVER A CALENDAR WITH HOLES. Unplanned days are not rows; the absence is
      // acknowledged once, at the bottom, in words.
      railEntryCount: 4,
      unplannedDaysAreNotRows: true,
      absenceStatedOnceAtTheBottom: true,
      nightOutIsARailLineNotACard: true,
    },
    prepare: () => seedPlanState("CHOSEN_DAYS"),
    navigate: gotoPlan,
  },
  {
    id: "dense",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3h (Dense)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // The density the container rule exists for. Fifteen meals in the same
      // scroll as five dinners, and STILL only five gold marks.
      slotCount: 15,
      dayCount: 5,
      goldRationaleCount: 5,
      compactRowsCarryTitleAndMetaOnly: true,
      nestedRowsSitInsideAnEightPxShell: true,
    },
    prepare: () => seedPlanState("DENSE"),
    navigate: gotoPlan,
  },
  {
    id: "midweek",
    briefRef: "brief-plan-states.md#State-6 (Mid-week evening)",
    expectedState: "midweek",
    readyText: "EARLIER THIS WEEK",
    facts: {
      // Mid-week inherits the CONFIRMED screen's rules and adds the past.
      chefStatus: "Set",
      hasNoFloatingAction: true,
      sectionLabels: ["EARLIER THIS WEEK"],
      pastDaysCollapseToFeedbackRows: true,
      hasPlanANewWeek: true,
    },
    prepare: () => seedPlanState("MIDWEEK"),
    navigate: gotoPlan,
  },
  {
    id: "uncooked-past-day",
    briefRef: "scope-1E.5.md#W4 (Divergence — rendering only)",
    expectedState: "midweek",
    readyText: "EARLIER THIS WEEK",
    facts: {
      // Griffin's S43 call: the STATE is expressible, the cascade is not. What
      // is being judged here is only whether a planned night that did not get
      // cooked renders honestly rather than as a lie.
      pastDaysCollapseToFeedbackRows: true,
      pastRowsDoNotClaimTheMealWasCooked: true,
      slotCount: 6,
    },
    prepare: () => seedPlanState("UNCOOKED_PAST"),
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
      // Wrapped is calm: no confetti, no "Nice job!". The one decision sits in
      // the floating slot like every other decision on this surface.
      floatingPrimary: "Plan next week",
      staysCalmNoCelebration: true,
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
      floatingPrimary: "Plan next week",
    },
    prepare: () => seedPlanState("ELAPSED_DRAFT"),
    navigate: gotoPlan,
  },
  {
    id: "adversarial",
    briefRef: "visual-qa-rubric.md#adversarial-content",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // Deliberately awkward content, so the layout is judged on its worst
      // realistic day rather than its best. RE-POINTED for 1E.5 (S44): two of
      // the three original findings are expected renderings now, and the chip
      // row it stressed no longer exists on the rail at all.
      hasOverlongTitle: true,
      overlongTitleIsClampedNotOverflowing: true,
      hasProvisionalRowNotAThinkingCard: true,
      hasThreeNearIdenticalTitles: true,
      nearIdenticalRowsAreStillDistinguishable: true,
      // The new stress cases.
      hasFourLineGoldRationale: true,
      goldRationaleStillReadsAsAHighlightNotAParagraph: true,
      hasOneDenseDayAmongSoloDays: true,
      mixedDensityDoesNotBreakTheRailRhythm: true,
      hasShortestTitleBesideLongest: true,
      nightOutIsARailLineNotACard: true,
      // 19900c is the top of what the validator admits — the estimate must
      // still render as "~$199", never with cents and never as a bare figure.
      hasMaximumCostEstimate: true,
    },
    prepare: () => seedPlanState("ADVERSARIAL"),
    navigate: gotoPlan,
  },
];
