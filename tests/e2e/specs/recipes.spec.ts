// RC1–RC10: the Recipes-tab reorg (Phase 1D Slice D, #14, docs/test-plan.md).
// Tiers (cooked strip / segmented library / plan-drafts shelf), search across
// tiers, favoriting-as-promote (detach), the "+" create menu, and the cooked-
// signal harvest driven end to end through a past confirmed slot. Recipes are
// seeded directly (deterministic); the harvest runs server-side on list load.
import { test, expect, type Page } from "@playwright/test";
import { seedRecipeState, resetTestHousehold } from "../app/seed";

const card = (page: Page, name: string | RegExp) =>
  page.getByTestId("recipe-card").filter({ hasText: name });
const strip = (page: Page) => page.getByTestId("cooked-strip");
const libraryList = (page: Page) => page.getByTestId("library-list");
const draftsList = (page: Page) => page.getByTestId("drafts-list");

test.afterAll(async () => {
  await resetTestHousehold();
});

test("RC1 - the three tiers render: cooked strip, segmented library, folded drafts", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  // Cooked strip up top, most-recent first (Chana cooked 3d ago, before Herb Roast 9d).
  await expect(strip(page)).toBeVisible();
  await expect(page.getByTestId("cooked-strip-card").first()).toContainText("Weeknight Chana Masala");

  // Segmented control with live counts (7 library, 2 favorites, 2 cooked).
  await expect(page.getByTestId("recipe-filter-all")).toContainText("7");
  await expect(page.getByTestId("recipe-filter-fav")).toContainText("2");
  await expect(page.getByTestId("recipe-filter-cooked")).toContainText("2");

  // Drafts folded by default.
  await expect(page.getByTestId("drafts-toggle")).toContainText("From your plans");
  await expect(page.getByText(/3 tucked away/)).toBeVisible();
  await expect(draftsList(page)).toBeHidden();
});

test("RC2 - the Favorites filter narrows to favorited library recipes", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await page.getByTestId("recipe-filter-fav").click();
  await expect(card(page, "Miso-Glazed Salmon")).toBeVisible();
  await expect(card(page, "Shrimp Scampi Linguine")).toBeVisible();
  await expect(card(page, "Sheet-Pan Chicken Thighs")).toBeHidden();
});

test("RC3 - the Cooked filter shows the cooked recipes with a cooked badge", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await page.getByTestId("recipe-filter-cooked").click();
  const cooked = card(page, "Herb Roast Chicken");
  await expect(cooked).toBeVisible();
  await expect(cooked).toContainText(/Cooked /);
  await expect(card(page, "Miso-Glazed Salmon")).toBeHidden();
});

test("RC4 - pagination: 7 library recipes show 5 then 'Show 2 more'", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await expect(libraryList(page).getByTestId("recipe-card")).toHaveCount(5);
  await page.getByTestId("show-more").click();
  await expect(libraryList(page).getByTestId("recipe-card")).toHaveCount(7);
});

test("RC5 - unfolding the drafts shelf reveals plan-draft cards with a badge", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await page.getByTestId("drafts-toggle").click();
  await expect(draftsList(page)).toBeVisible();
  const draft = draftsList(page).getByTestId("recipe-card").filter({ hasText: "Gochujang" });
  await expect(draft).toBeVisible();
  await expect(draft).toContainText("Plan draft");
});

test("RC6 - favoriting a plan draft promotes it: toast, leaves drafts, persists as a favorite", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await page.getByTestId("drafts-toggle").click();
  const draft = draftsList(page).getByTestId("recipe-card").filter({ hasText: "Gochujang" });
  const promoted = page.waitForResponse((r) => r.url().includes("favorite"));
  await draft.getByRole("button", { name: "Add to favorites" }).click();

  // The promote moment: toast + the card leaves the drafts shelf.
  await expect(page.getByTestId("recipe-toast")).toContainText("Moved to Your recipes");
  await expect(draftsList(page).getByText("Gochujang")).toBeHidden();
  await promoted; // let the detach persist before reloading

  // Detach persisted: after reload it's a favorited library recipe, not a draft.
  await page.reload();
  await page.getByTestId("recipe-filter-fav").click();
  await expect(card(page, "Gochujang")).toBeVisible();
  await page.getByTestId("drafts-toggle").click();
  await expect(draftsList(page).getByText("Gochujang")).toBeHidden();
});

test("RC7 - search reaches every tier, including plan drafts", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  // "Gochujang" is a folded plan draft — search must still find it.
  await page.getByTestId("recipe-search").fill("Gochujang");
  await expect(card(page, "Gochujang-Glazed Tofu Bowls")).toBeVisible();
  await expect(strip(page)).toBeHidden();

  // A cooked recipe is reachable too.
  await page.getByTestId("recipe-search").fill("Herb Roast");
  await expect(card(page, "Herb Roast Chicken")).toBeVisible();

  // Clearing search returns the tiered view.
  await page.getByTestId("recipe-search").fill("");
  await expect(strip(page)).toBeVisible();
});

test("RC8 - the '+' create menu opens the Generate entry point", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  await page.getByTestId("recipe-add").click();
  await expect(page.getByTestId("create-menu")).toBeVisible();
  await page.getByTestId("create-generate").click();
  await expect(page.getByText("Ask your chef")).toBeVisible();
});

test("RC9 - the cooked-signal harvest stamps a past confirmed slot on tab load", async ({ page }) => {
  await seedRecipeState("RECIPES_COOKED_HARVEST");
  await page.goto("/recipes");

  // Thai Basil Chicken had no lastCookedAt seeded; a confirmed slot 3 days ago
  // points at it, so loading /recipes must harvest it into the cooked strip and
  // graduate it out of the drafts tier.
  await expect(strip(page).getByText("Thai Basil Chicken")).toBeVisible();
  await expect(page.getByTestId("recipe-filter-cooked")).toContainText("1");
  await expect(page.getByText(/tucked away/)).toBeHidden();

  // The recipe with no past slot stays out of the cooked tier.
  await expect(strip(page).getByText("Uncooked Pantry Pasta")).toBeHidden();
});

test("RC10 - an empty library shows the first-run empty state", async ({ page }) => {
  await seedRecipeState("RECIPES_EMPTY");
  await page.goto("/recipes");

  await expect(page.getByText("Your recipe library is empty")).toBeVisible();
});
