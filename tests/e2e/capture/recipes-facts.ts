// App-specific (meal-app): the Recipes-tab capture states + ground-truth facts
// for the Slice D reorg. No debug-HUD section on this tab, so states gate on
// readyText + facts. Copy strings verified against the components; interaction
// states drive the filter/drafts/create-menu and wait before the shot.
import { type Page } from "@playwright/test";
import { seedRecipeState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

export const RECIPE_SECTION_KEY = "recipe";

async function gotoLibrary(page: Page): Promise<void> {
  await page.goto("/recipes");
  await page.getByText("Recently cooked", { exact: false }).first().waitFor({ timeout: 15_000 });
}

export const RECIPE_CAPTURE_STATES: CaptureStateDef[] = [
  {
    id: "recipes-library",
    briefRef: "recipes/imported.dc.html — tiered library (direction d)",
    readyText: "Recently cooked",
    facts: {
      cookedStrip: true,
      segmentedFilters: ["All", "Favorites", "Cooked"],
      filtersShowCounts: true,
      libraryCards: true,
      draftsShelfCollapsed: "From your plans",
      // ⚠️ THIS FACT USED TO SAY `floatingToolbar: "search + circular ＋"` and
      // W10 deleted that toolbar. A capture fact is ground truth the critique
      // grades the pixels against, so a stale one does not fail — it argues the
      // screenshot is wrong. Same class as BUG-030: in a spec a dead selector
      // goes red, here it quietly corrupts the judgment.
      noFloatingToolbar: true,
      searchIsInTheHeader: true,
      addIsAnIconButtonBesideSearch: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: (page) => page.goto("/recipes").then(() => {}),
  },
  {
    id: "recipes-cooked-filter",
    briefRef: "recipes — Cooked segment selected (cooked cards + badges)",
    readyText: "Recently cooked",
    facts: {
      cookedFilterActive: true,
      cardsShowCookedBadge: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByTestId("recipe-filter-cooked").click();
      await page.waitForTimeout(300);
    },
  },
  {
    id: "recipes-drafts-expanded",
    briefRef: "recipes — FROM YOUR PLANS shelf expanded (draft cards + promote)",
    readyText: "Recently cooked",
    facts: {
      draftsExpanded: true,
      draftCardsShowPlanDraftBadge: true,
      favoriteHeartPromotes: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByTestId("drafts-toggle").click();
      await page.getByTestId("drafts-list").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "recipes-create-menu",
    briefRef: "recipes — floating ＋ create menu (Generate / Import URL)",
    readyText: "Recently cooked",
    facts: {
      createMenuOpen: true,
      menuItems: ["Generate", "Import URL"],
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByTestId("recipe-add").click();
      await page.getByTestId("create-menu").waitFor({ timeout: 8_000 });
    },
  },
  {
    // W10's other half, and the one the library capture cannot show. `3l` puts
    // the verb on the DETAIL screen, so this is the only state where the
    // Recipes tab has a floating object at all.
    id: "recipes-detail-add-to-week",
    briefRef: "surfaces/plan/final-direction-2.dc.html#3l (Add to this week)",
    readyText: "Miso-Glazed Salmon",
    facts: {
      addToWeekIsTheOneFloatingObject: "Add to this week",
      verbNeverAsksForADay: true,
      // §D's rule at the bottom edge: the floating primary clears the tab bar
      // and nothing else competes with it down there.
      exactlyOneFloatingLayerAboveTheTabBar: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByText("Miso-Glazed Salmon", { exact: false }).first().click();
      // ENABLED, not merely present. The verb is disabled while `plan.current`
      // is in flight — deliberately, so a fast tap on a slow connection cannot
      // be answered from "no data yet" as though it meant "no week". Shooting on
      // presence alone caught it mid-flight at `disabled:opacity-60`, and a
      // grey primary photographs as a dead control rather than a loading one.
      await page
        .locator('[data-testid="add-to-week"]:not([disabled])')
        .waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "recipes-empty",
    briefRef: "recipes — first-run empty library",
    readyText: "Your recipe library is empty",
    facts: {
      emptyCopy: "Your recipe library is empty",
      hasGenerate: true,
      hasImport: true,
    },
    prepare: () => seedRecipeState("RECIPES_EMPTY"),
    navigate: (page) => page.goto("/recipes").then(() => {}),
  },
];
