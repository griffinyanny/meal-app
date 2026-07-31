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

// ── W10 · the corrected bottom edge (Phase 1E.5, frame `3l`) ───────────────
// Spec §12 item 04's floating-primary half, pulled forward from 1F. Two halves,
// two screens: the LIBRARY loses its floating toolbar, and the DETAIL gains the
// one thing that is allowed to float.

test("RC11 - the library floats nothing: the toolbar is gone and search is in the header", async ({
  page,
}) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  // Pattern B: search is never a floating object. It is still here — it moved,
  // it was not removed — and so is the one way to create a recipe.
  const search = page.getByTestId("recipe-search");
  await expect(search).toBeVisible();
  await expect(page.getByTestId("recipe-add")).toBeVisible();

  // The rule, measured rather than asserted from a class name: nothing on this
  // screen is pinned to the viewport. `position: fixed` is what "floating"
  // means, and the FAB and search pill were the only two things that had it.
  const fixedCount = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>("main *")].filter(
        (el) => getComputedStyle(el).position === "fixed"
      ).length
  );
  expect(fixedCount).toBe(0);

  // And it still works from its new home.
  await search.fill("Miso");
  await expect(page.getByText("Search results")).toBeVisible();
});

test("RC12 - the detail screen's one floating object is the verb", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");
  await card(page, "Miso-Glazed Salmon").click();

  const verb = page.getByTestId("add-to-week");
  await expect(verb).toBeVisible();
  await expect(verb).toHaveText("Add to this week");

  // IT NEVER ASKS FOR A DAY (`3l`). A day picker opening here would make this a
  // scheduler, which is the one thing the ledger says a chosen recipe is not.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("RC13 - with no week to add to, the verb carries the recipe to the intent screen", async ({
  page,
}) => {
  // RECIPES_LIBRARY seeds a DRAFT plan for the drafts shelf to hang off, but it
  // seeds no slots — so there is no week to place anything into. The honest
  // answer is to carry the choice rather than fail at a button that reads like
  // it should work.
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");
  await card(page, "Miso-Glazed Salmon").click();

  await page.getByTestId("add-to-week").click();

  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByTestId("plan-pick")).toContainText("Miso-Glazed Salmon");
});

// BUG-038. Asserted in BOTH directions on purpose: "the empty recipe hides the
// cards" alone would also pass against a build that deleted the sections
// outright, which is a different and worse bug. The populated half is what
// makes this spec able to fail for the right reason.
test("RC14 - an empty body omits the section entirely; a populated one still renders it", async ({
  page,
}) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");

  // The un-hydrated plan draft: a title the plan made before the recipe existed.
  await page.getByTestId("drafts-toggle").click();
  await draftsList(page).waitFor();
  await card(page, "Chicken Katsu Bowls").click();

  const ingredientsHeading = page.getByRole("heading", { name: "Ingredients" });
  const stepsHeading = page.getByRole("heading", { name: "Steps" });

  await expect(page.getByTestId("recipe-body-empty")).toHaveText(
    "No ingredients or steps on this one yet."
  );
  await expect(ingredientsHeading).toHaveCount(0);
  await expect(stepsHeading).toHaveCount(0);

  // The other direction: a recipe that HAS a body still shows both sections and
  // no fallback line.
  await page.goto("/recipes");
  await card(page, "Miso-Glazed Salmon").click();

  await expect(ingredientsHeading).toBeVisible();
  await expect(stepsHeading).toBeVisible();
  await expect(page.getByTestId("recipe-body-empty")).toHaveCount(0);
});

// BUG-037. The refusal is correct and stays; what is under test is that it says
// so. Held open by a routed delay rather than a throttle so the window exists on
// a fast machine too — S50's rule that a spec which only reproduces on a slow
// machine is worse than none.
test("RC15 - while the week is still loading, the verb names the wait instead of going dead", async ({
  page,
}) => {
  await seedRecipeState("RECIPES_LIBRARY");

  let releasePlanQuery = () => {};
  const held = new Promise<void>((resolve) => {
    releasePlanQuery = resolve;
  });
  await page.route("**/api/trpc/**", async (route) => {
    if (route.request().url().includes("plan.current")) await held;
    await route.continue();
  });

  await page.goto("/recipes");
  await card(page, "Miso-Glazed Salmon").click();

  const verb = page.getByTestId("add-to-week");
  await expect(verb).toHaveText("Checking your week…");
  await expect(verb).toBeDisabled();

  // And it resolves to the real verb once the week lands, so the loading label
  // cannot get stuck as the permanent one.
  releasePlanQuery();
  await expect(verb).toHaveText("Add to this week");
  await expect(verb).toBeEnabled();
});
