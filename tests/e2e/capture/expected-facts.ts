// App-specific (meal-app): the Plan-tab capture states + their ground-truth
// facts. This is the only per-app file in the capture layer; capture-runtime.ts
// and the config are generic. Facts describe what SHOULD be visibly true in each
// screenshot — the critique verifies them (correctness), which anchors the
// vision judgment. Copy strings verified against the components.
import { type Page } from "@playwright/test";
import { seedPlanState } from "../app/seed";
import { mealRow } from "../app/selectors";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";
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

// SLICE 2's states need interaction, not just a seed — the picker is a sheet you
// open, and three of the five only exist after a tap. `navigate` already allows
// it (Recipes uses it for the drafts shelf); Slice 1 simply never needed it.
//
// The picker is opened from a MEAL rather than from the intent screen on
// purpose: that is frame `3e`, the invocation where the person has already named
// the night, and it is the one whose primary has to read "Put it on <day>".
const PICKER_OPEN_FROM_MEAL = async (page: Page): Promise<void> => {
  await page.goto("/plan");
  await page.getByText(RAIL_READY).first().waitFor({ timeout: 15_000 });
  // Tomorrow's row — a 30-minute night, which is what makes the three-hour lamb
  // unfittable and therefore visibly dimmed in the opening content.
  await mealRow(page, addDaysISO(todayISO(), 1)).click();
  await page.getByTestId("library-door").click();
  await page.getByTestId("picker-search").waitFor({ timeout: 8_000 });
};

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
    // W7's sheet, and the gap this session found: the meal sheet shipped in S44
    // and Layer A has NEVER photographed it. Slice 1 cleared 0/0 without one
    // frame of the surface that sits on top of everything else — which is how
    // the drawer's missing backdrop blur survived a clean gate.
    id: "meal-sheet",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3k (the meal sheet)",
    readyText: "View full recipe",
    useHud: false,
    viewportOnly: true,
    facts: {
      // §W7: a SUMMARY, not the recipe. Ingredients and steps never enter Plan.
      rationaleAtFeatureSize: true,
      hasViewFullRecipeLinkOut: true,
      hasNoIngredientsOrSteps: true,
      // The finding this state exists for: the sheet is opaque enough that
      // nothing behind it is legible through the fill.
      nothingBehindReadsThroughTheFill: true,
    },
    prepare: () => seedPlanState("DRAFT"),
    navigate: async (page) => {
      await page.goto("/plan");
      await page.getByText(RAIL_READY).first().waitFor({ timeout: 15_000 });
      await mealRow(page, todayISO()).click();
      await page.getByText("View full recipe").waitFor({ timeout: 8_000 });
    },
  },
  // ── Slice 2 · library into plan (W8/W9) ─────────────────────────────────
  {
    id: "picker-opened",
    briefRef: "surfaces/plan/final-direction-1.dc.html#3b,#3e (the picker)",
    useHud: false,
    viewportOnly: true,
    readyText: "SAVED, NEVER COOKED",
    facts: {
      // §A. The picker is a PLACE, not a dropdown: it opens on the one read
      // only this product has, said by the chef, and counted rather than hedged.
      opensOnSavedNeverCooked: true,
      // S48: the chef reads its own list — the line counts what FITS the named
      // night, not just what is waiting (two of the three run past 30 minutes).
      chefLineCountsThem: "3 of these have been waiting — 1 of them fits",
      pickerRowCount: 3,
      // Named doors with counts. Tiles, never filter chips — and only HONEST
      // ones (S48): zero-count doors and doors identical to `All` are
      // suppressed, so this five-recipe library shows three (`Recently saved`
      // was `All` under a different name).
      browseTileCount: 3,
      tilesCarryCounts: true,
      // The three-hour lamb against a 30-minute night. It DIMS AND SAYS WHY in
      // its own meta rather than vanishing.
      unfittableRowDimsWithItsReason: "3 hr · longer than",
      // §A: no action bar until something is selected. An inert primary is a nag.
      hasNoActionBarYet: true,
      // §D, and the reason this is a third subject rather than a second drawer.
      exactlyOneSheetInTheTree: true,
      searchIsInTheSheetHeader: true,
    },
    prepare: () => seedPlanState("PICKABLE"),
    navigate: PICKER_OPEN_FROM_MEAL,
  },
  {
    id: "picker-tile-pushed",
    briefRef: "surfaces/plan/final-direction-1.dc.html#3c (a tile pushed)",
    useHud: false,
    viewportOnly: true,
    readyText: "Spaghetti alla Carbonara",
    facts: {
      // S43's call, and the whole reason tiles beat chips: a pushed view carries
      // its OWN heading and count, which is what makes a tile a door.
      pushedViewCarriesItsOwnHeading: true,
      tilesAreGoneBecauseYouAreThroughOne: true,
      pickerRowCount: 2,
      showsCookedRecipesOnly: true,
    },
    prepare: () => seedPlanState("PICKABLE"),
    navigate: async (page) => {
      await PICKER_OPEN_FROM_MEAL(page);
      await page
        .getByTestId("picker-tile")
        .filter({ hasText: "Cooked" })
        .click();
      await page
        .getByTestId("picker-row")
        .filter({ hasText: "Spaghetti alla Carbonara" })
        .waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "picker-multi-select",
    briefRef: "surfaces/plan/final-direction-1.dc.html#3d (multi-select)",
    useHud: false,
    viewportOnly: true,
    readyText: "Spaghetti alla Carbonara",
    facts: {
      // §A. Selection is CREAM, never gold — a checkbox is the user's act, and
      // gold marks the chef speaking (the gold line, S42).
      selectionIsCreamNotGold: true,
      // The count lives in the VERB, not in a badge beside it.
      countLivesInTheVerb: "Give the chef these two",
      // THE SUPPORT LINE IS THE RECEIPT (S48): with picks made across two
      // sections the second checkbox is scrolled out of sight, and this is the
      // only line that can still name it. It stops restating the verb.
      supportLineIsTheReceipt:
        "Sichuan Dry-Fried Green Beans and Spaghetti alla Carbonara.",
      hasClearAsTypeNotAControl: true,
      // Selections survive crossing a door, which is what makes multi-select
      // real rather than a checkbox you can only use once.
      selectionSurvivedThePush: true,
      // A selected unfittable row UN-DIMS (S48): dimmed-and-checked is the
      // universal grammar for a stuck control. The reason stays in its meta.
      selectedUnfittableRowIsNotDimmed: true,
      // 22px inside a sheet, NOT 96px — the 96 exists only to clear a tab bar,
      // and there is no tab bar behind a sheet.
      actionBarSitsAt22pxInsideTheSheet: true,
    },
    prepare: () => seedPlanState("PICKABLE"),
    navigate: async (page) => {
      await PICKER_OPEN_FROM_MEAL(page);
      await page
        .getByTestId("picker-row")
        .filter({ hasText: "Sichuan Dry-Fried Green Beans" })
        .click();
      await page
        .getByTestId("picker-tile")
        .filter({ hasText: "Cooked" })
        .click();
      await page
        .getByTestId("picker-row")
        .filter({ hasText: "Spaghetti alla Carbonara" })
        .click();
      await page.getByTestId("picker-confirm").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "picker-empty-library",
    briefRef: "surfaces/plan/final-direction-1.dc.html#3d (empty library)",
    useHud: false,
    viewportOnly: true,
    readyText: "Nothing in here yet.",
    facts: {
      // §A, and it is a rule about TONE as much as layout: the person did
      // nothing wrong and the product works fine without a library.
      noIllustration: true,
      noApology: true,
      // S48: the search field is ABSENT, not enabled — frame `3d` omitted it
      // deliberately, and a field over an empty set is a door onto nothing.
      searchIsAbsent: true,
      // States what the surface is FOR in the future tense, then hands back the
      // action that works today.
      primaryIsTheActionThatWorksToday: "Let the chef write it",
      // ONE honest door (S48): both old doors went to /recipes, and `Paste a
      // recipe or a link` promised an act this surface cannot perform.
      oneDoorAboveThePrimary: "Look through the Recipes tab",
    },
    prepare: () => seedPlanState("EMPTY"),
    navigate: async (page) => {
      await page.goto("/plan");
      await page.getByTestId("library-door").click();
      await page.getByTestId("picker-empty-primary").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "picked-row",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3f (the picked meal)",
    expectedState: "review",
    readyText: RAIL_READY,
    facts: {
      // §B. PROVENANCE IS TYPE, NOT CHROME — the eyebrow states it the way it
      // states DINNER. No badge, no accent, no second card design.
      provenanceEyebrow: "DINNER · PICKED",
      hasBookmarkGlyph: true,
      noBadgeNoAccentNoSecondCardDesign: true,
      // One picked night among six chef-proposed ones, so the two row types sit
      // together and the ONLY difference is the eyebrow.
      slotCount: 7,
      pickedRowCount: 1,
      // A picked meal's rationale argues PLACEMENT, not the dish — the chef did
      // not choose the food and has nothing to say about it.
      pickedRationaleArguesPlacement: "while it's fresh",
      // The boundary, stated rather than enforced silently — as PRODUCT COPY
      // on the picked row (BUG-041, S48), because the live model never wrote
      // the sentence and a guarantee has to be deterministic. Caption colour,
      // not gold: it is the product speaking, not the chef.
      boundaryIsProductCopyOnTheRow: "Your recipe — the chef won't rewrite it.",
    },
    prepare: () => seedPlanState("PICKED"),
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
