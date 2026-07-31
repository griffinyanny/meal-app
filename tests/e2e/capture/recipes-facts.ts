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
    // ⚠️ NEW S56 (1F/B7). Both Recipes dialogs were rebuilt onto the spec §09
    // control — and neither had EVER been a capture state, so the visual layer
    // was structurally unable to see the two surfaces this item changed most.
    // Same class as S47's "Layer A had never captured a sheet state" and S52's
    // `grocery-complete-banner`: found only by asking what the layer cannot see,
    // and pointed at the current session's own work rather than a past one's.
    id: "recipes-generate-dialog",
    briefRef: "recipes — Ask your chef (generate), spec §09 control",
    readyText: "Recently cooked",
    facts: {
      dialogTitle: "Ask your chef",
      suggestionChipsAboveTheField: true,
      freeformField:
        "spec §09 control: mic + growing field + cream send, all three visible at rest",
      // The commit lives IN the control. The full-width `Generate recipe`
      // button was deleted in B7 — it was a second filled cream button in the
      // same viewport as the send (law 06).
      noSeparateCommitButton: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByTestId("recipe-add").click();
      await page.getByTestId("create-generate").click();
      await page.getByTestId("generate-recipe-input").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "recipes-modify-dialog",
    briefRef: "recipes — Modify recipe, spec §09 control",
    readyText: "Ingredients",
    facts: {
      dialogTitle: "Modify recipe",
      freeformField:
        "spec §09 control: mic + growing field + cream send, all three visible at rest",
      noSeparateCommitButton: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page
        .getByTestId("recipe-card")
        .filter({ hasText: "Miso-Glazed Salmon" })
        .click();
      await page.getByTestId("add-to-week").waitFor({ timeout: 8_000 });
      await page.getByRole("button", { name: "Modify recipe" }).click();
      await page.getByTestId("modify-recipe-input").waitFor({ timeout: 8_000 });
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
      // ⚠️ NEW S53, and the reason this capture is worth re-reading rather than
      // re-approving: until now the seeder wrote `ingredients: []` / `steps: []`
      // for EVERY recipe, so this shot has never once shown a populated body.
      // It graded two empty labelled cards (BUG-038) as the canonical detail
      // screen. The body is real now — judge the ingredient list and the
      // numbered steps as first-time surface, not as a re-shoot.
      ingredientsAndStepsRenderWithContent: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByText("Miso-Glazed Salmon", { exact: false }).first().click();
      // Settled, not merely present — this state is the verb at rest. The
      // in-flight treatment used to be an unlabelled grey button (BUG-037) that
      // this wait quietly stepped around, which made the gate structurally
      // unable to see it. It is now a named state of its own
      // (`recipes-detail-checking-week`) rather than something to wait out.
      await page
        .locator('[data-testid="add-to-week"]:not([disabled])')
        .waitFor({ timeout: 8_000 });
    },
  },
  {
    // BUG-038's production repro, and it had no capture state at all: a plan
    // draft whose recipe body was never generated. The rule under test is that
    // a section with nothing in it is OMITTED — never a labelled container that
    // opens and says nothing.
    id: "recipes-detail-empty",
    briefRef: "bug-tracker BUG-038 — recipe detail with no ingredients or steps",
    readyText: "Chicken Katsu Bowls",
    facts: {
      noEmptyLabelledContainers: true,
      omitsIngredientsAndStepsCardsEntirely: true,
      saysWhyInOneLine: "No ingredients or steps on this one yet.",
      // The screen is SHORT on purpose. There is nothing to read, so the void
      // that used to sit under two empty cards should be gone rather than
      // redistributed — if this shot still shows a long scroll, the fix missed.
      noLongVoidAboveTheFloatingVerb: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await gotoLibrary(page);
      await page.getByTestId("drafts-toggle").click();
      await page.getByTestId("drafts-list").waitFor({ timeout: 8_000 });
      await page.getByText("Chicken Katsu Bowls", { exact: false }).first().click();
      await page.getByTestId("recipe-body-empty").waitFor({ timeout: 8_000 });
      // ⚠️ The FIRST run of this state shot the verb mid-load, so it came back
      // reading "Checking your week…" — this state and
      // `recipes-detail-checking-week` were photographing the same thing and
      // neither was being graded cleanly. Waiting for the settled verb is what
      // makes the two states distinct subjects rather than a race.
      await page
        .locator('[data-testid="add-to-week"]:not([disabled])')
        .waitFor({ timeout: 8_000 });
    },
  },
  {
    // BUG-037. The verb is deliberately refused while `plan.current` is in
    // flight, and that reasoning is right — answering a fast tap from "no data
    // yet" would send someone with a live week to the intent screen. What was
    // wrong is that the refusal had no words, so the tab's ONE floating object
    // photographed as a dead control. Held open by a routed delay rather than a
    // throttle, so the state is deterministic instead of machine-speed
    // dependent (S50's rule: a spec that only reproduces on a slow machine is
    // worse than none).
    id: "recipes-detail-checking-week",
    briefRef: "bug-tracker BUG-037 — the verb while plan.current is in flight",
    readyText: "Miso-Glazed Salmon",
    facts: {
      verbNamesTheWait: "Checking your week…",
      readsAsWorkingNotBroken: true,
      stillRefusesTheTap: true,
    },
    prepare: () => seedRecipeState("RECIPES_LIBRARY"),
    navigate: async (page) => {
      await page.route("**/api/trpc/**", async (route) => {
        if (route.request().url().includes("plan.current")) {
          await new Promise((r) => setTimeout(r, 15_000));
        }
        await route.continue();
      });
      await gotoLibrary(page);
      await page.getByText("Miso-Glazed Salmon", { exact: false }).first().click();
      await page
        .locator('[data-testid="add-to-week"][disabled]')
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
