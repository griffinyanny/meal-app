// App-specific (meal-app): the Recipes-tab capture states + ground-truth facts
// for the Slice D reorg. No debug-HUD section on this tab, so states gate on
// readyText + facts. Copy strings verified against the components; interaction
// states drive the filter/drafts/create-menu and wait before the shot.
import { type Page } from "@playwright/test";
import { seedRecipeState } from "../app/seed";
import { type CaptureStateDef } from "./capture-runtime";

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
      floatingToolbar: "search + circular ＋",
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
