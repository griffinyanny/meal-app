// App-specific (meal-app): the Groceries-tab capture states + ground-truth facts.
// Groceries publishes no debug-HUD section (only Plan does), so these states are
// gated on readyText + facts rather than a HUD derivedState — the capture runtime
// handles a missing HUD gracefully (captureStatus stays "ok"). Copy strings are
// verified against the components. Some states drive a small interaction in
// navigate() (toggle mode, check an item, open the chef sheet) and wait for the
// resulting element before the shot.
import { type Page } from "@playwright/test";
import { seedGroceryState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

// No HUD section on this tab; a nominal key for the manifest meta.
export const GROCERY_SECTION_KEY = "grocery";

const gotoGroceries = (page: Page) => page.goto("/groceries").then(() => {});

// Go to a ready list AND wait for the staples chip row to resolve — it's a
// separate async query (staples.list) that lands after the list itself, so
// gating only on the header can shoot before the chips render.
async function gotoReady(page: Page): Promise<void> {
  await page.goto("/groceries");
  await page.getByText("Your list", { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.getByTestId("staples-row").waitFor({ timeout: 8_000 }).catch(() => {});
}

export const GROCERY_CAPTURE_STATES: CaptureStateDef[] = [
  {
    id: "grocery-ready-grouped",
    briefRef: "groceries/imported.dc.html — grouped shoppable list",
    readyText: "Your list",
    facts: {
      header: "Your list",
      hasProgressBar: true,
      organizeToggle: ["Grouped", "Ungrouped"],
      aisleSections: true,
      mergeDotOnMultiSourceItem: "garlic (2 dinners → amber dot)",
      hasStaplesRow: true,
      hasTopAddRow: true,
      hasBottomAddRow: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: gotoReady,
  },
  {
    id: "grocery-generating",
    briefRef: "groceries — generating (phase-named loading)",
    readyText: "Sorting your ingredients",
    facts: {
      phaseCopy: "Sorting your ingredients… (normalizing phase)",
      hasSkeletonOrShimmer: true,
      noListYet: true,
    },
    prepare: () => seedGroceryState("GROCERY_GENERATING"),
    navigate: gotoGroceries,
  },
  {
    id: "grocery-error",
    briefRef: "groceries — error (reuses Plan's stream-error card)",
    readyText: "The chef got stuck building your list.",
    facts: {
      errorCopy: "The chef got stuck building your list.",
      hasTryAgain: true,
    },
    prepare: () => seedGroceryState("GROCERY_ERROR"),
    navigate: gotoGroceries,
  },
  {
    id: "grocery-manual-mode",
    briefRef: "groceries — ungrouped/manual (notepad) mode with drag handles",
    readyText: "Your list",
    facts: {
      organizeMode: "Ungrouped active",
      flatList: true,
      hasDragHandles: true,
      noAisleHeaders: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByRole("tab", { name: "Ungrouped" }).click();
      await page.getByRole("button", { name: "Drag to reorder" }).first().waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "grocery-checked-gotit",
    briefRef: "groceries — one-zone GOT IT check-off",
    readyText: "Your list",
    facts: {
      checkedItemMovesToGotItZone: true,
      gotItZoneVisible: true,
      progressAdvanced: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByTestId("grocery-row").first().getByRole("checkbox").click();
      await page.getByTestId("grocery-gotit-zone").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "grocery-chef-sheet",
    briefRef: "groceries — Talk-to-the-Chef sheet (secondary NL add/query)",
    readyText: "Your list",
    facts: {
      sheetHeadline: "What else do you need?",
      hasSuggestionPills: true,
      hasTextarea: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByTestId("grocery-open-chef").click();
      await page.getByText("What else do you need?", { exact: false }).waitFor({ timeout: 8_000 });
    },
  },
];
