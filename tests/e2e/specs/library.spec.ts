// L — library into plan (Phase 1E.5 · Slice 2).
//
// L1–L4 (S45) cover PROVENANCE and seed a pick rather than performing one: the
// ledger's rule there is a claim about RENDERING ("provenance is type, not
// chrome") and it is true or false independently of how the pick got there.
// They still seed, deliberately — a rendering rule asserted through a five-step
// interaction fails for five reasons, only one of which is the rule.
//
// L5 onward (S46) cover the ENTRY POINTS the ledger's §A describes — the picker
// (W8) and `Add to this week` (W10) — and those DO perform, end to end through
// the AI mock, because what they claim is a round trip: the person names the
// dish, the chef names the night.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { planRail, mealRow, sheetContent, closeButton } from "../app/selectors";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";
import { PICK_RATIONALE } from "../../../src/server/ai/providers/e2e-fixtures/plan";

test.afterAll(async () => {
  await resetTestHousehold();
});

// The PICKED seed puts the pick on day 1 and leaves the other six to the chef.
const PICKED_DATE = () => addDaysISO(todayISO(), 1);
const PROPOSED_DATE = () => addDaysISO(todayISO(), 2);

test("L1 - a picked meal says PICKED in its eyebrow, as a type", async ({
  page,
}) => {
  await seedPlanState("PICKED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  const row = mealRow(page, PICKED_DATE());
  await expect(row).toContainText("Spaghetti alla Carbonara");
  // Asserted as the WHOLE eyebrow string, not a substring match on "PICKED".
  // The rule is that provenance joins the type line the way DINNER does, so a
  // badge rendered somewhere else on the card would satisfy `toContainText`
  // while breaking the actual ledger rule.
  await expect(row).toContainText("DINNER · PICKED");
});

test("L2 - a chef-proposed meal in the same week carries no provenance", async ({
  page,
}) => {
  // The half that makes L1 mean something. If the eyebrow said PICKED on every
  // row, L1 would pass and the feature would be broken — provenance that never
  // varies is decoration, not information.
  await seedPlanState("PICKED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  const row = mealRow(page, PROPOSED_DATE());
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("PICKED");
});

test("L3 - a picked meal's rationale argues placement, not the dish", async ({
  page,
}) => {
  // §B. The chef did not choose the food and has nothing to say about it, so
  // the one gold line it is allowed says WHY THIS NIGHT. This is the assertion
  // that will catch a future generation change quietly making the chef review
  // a recipe the person already decided on.
  await seedPlanState("PICKED");
  await page.goto("/plan");

  const row = mealRow(page, PICKED_DATE());
  await expect(row).toContainText("Put it midweek");
});

test("L4 - the boundary is stated rather than enforced silently", async ({
  page,
}) => {
  // §B: "it's your recipe, so I won't rewrite it." The chef says the limit out
  // loud in the week summary instead of the person discovering it by finding a
  // modify that does nothing.
  await seedPlanState("PICKED");
  await page.goto("/plan");

  await expect(
    page.getByText("it's your recipe, so I won't rewrite it")
  ).toBeVisible();
});

// ── W8 · the picker, performed ────────────────────────────────────────────
// PICKABLE is a five-night draft with a real five-recipe library behind it:
// three never cooked, two cooked, one imported, and one that runs three hours.

// Opened FROM a meal, so the night is the person's — `3e`'s primary reads "Put
// it on <that day>", and the pick lands there rather than wherever the chef
// would otherwise have chosen (PICK_DAY_OFFSET).
const FROM_MEAL_OFFSET = 1;
const PICK_LANDED_DATE = () => addDaysISO(todayISO(), FROM_MEAL_OFFSET);

async function openPickerFromMeal(page: import("@playwright/test").Page) {
  await seedPlanState("PICKABLE");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  await mealRow(page, addDaysISO(todayISO(), FROM_MEAL_OFFSET)).click();
  await expect(sheetContent(page)).toBeVisible();
  await page.getByTestId("library-door").click();
}

test("L5 - the picker opens on Saved, never cooked, as content rather than a sort order", async ({
  page,
}) => {
  // §A. The first thing on the surface is the one read only this product has,
  // said by the chef, in italic, once — not a dropdown you have to discover.
  await openPickerFromMeal(page);

  await expect(page.getByText("SAVED, NEVER COOKED")).toBeVisible();
  // Three of the five seeded recipes have never been cooked, and the chef's
  // line COUNTS them: a sentence that said "some" would be the sort order
  // wearing a voice.
  await expect(page.getByText(/3 of these have been waiting/)).toBeVisible();

  const rows = page.getByTestId("picker-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "Sichuan Dry-Fried Green Beans" })).toBeVisible();
  // Cooked recipes are NOT in the opening content — if they were, "saved, never
  // cooked" would be a heading over the whole library.
  await expect(rows.filter({ hasText: "Miso-Glazed Salmon" })).toHaveCount(0);
});

test("L6 - browse is four named doors with counts, and they push", async ({ page }) => {
  // §A: a chip implies subtraction from a list you can already see; a tile
  // implies a door. The counts are the whole affordance.
  await openPickerFromMeal(page);

  const tiles = page.getByTestId("picker-tile");
  await expect(tiles).toHaveCount(4);
  await expect(tiles.filter({ hasText: "Cooked before" })).toContainText("2 recipes");
  await expect(tiles.filter({ hasText: "Everything" })).toContainText("5 recipes");

  // PUSH, not filter (S43 call): the pushed view carries its own heading, and
  // the doors are gone because you are through one of them.
  await tiles.filter({ hasText: "Cooked before" }).click();
  await expect(page.getByTestId("picker-tile")).toHaveCount(0);
  await expect(page.getByTestId("picker-row")).toHaveCount(2);
  await expect(
    page.getByTestId("picker-row").filter({ hasText: "Spaghetti alla Carbonara" })
  ).toBeVisible();
});

test("L7 - a recipe that cannot fit the night dims and says why, rather than vanishing", async ({
  page,
}) => {
  // §A. Disappearing rows make the library feel smaller than it is, and the
  // reason is the useful part. The seeded night is a 30-minute dinner, so the
  // three-hour lamb cannot fit it.
  await openPickerFromMeal(page);

  const lamb = page
    .getByTestId("picker-row")
    .filter({ hasText: "Lamb Shoulder with Anchovy" });

  await expect(lamb).toBeVisible();
  await expect(lamb).toHaveAttribute("data-unfittable", "true");
  await expect(lamb).toContainText("3 hr — longer than");
  // And the constraint became one of the four doors — the ONE tile that swaps.
  await expect(
    page.getByTestId("picker-tile").filter({ hasText: "Under 30 min" })
  ).toBeVisible();
});

test("L8 - there is no action bar until something is selected, and the count lives in the verb", async ({
  page,
}) => {
  // §A: an inert primary is a nag. `Clear` is type, not a control, and it too
  // exists only once there is something to clear.
  await openPickerFromMeal(page);

  await expect(page.getByTestId("picker-confirm")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear" })).toHaveCount(0);

  await page
    .getByTestId("picker-row")
    .filter({ hasText: "Sichuan Dry-Fried Green Beans" })
    .click();

  // The night is already decided here, so the primary names the destination.
  await expect(page.getByTestId("picker-confirm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();

  // Selections hold across sections, which is what makes multi-select real
  // rather than a checkbox you can only use once.
  await page.getByTestId("picker-tile").filter({ hasText: "Cooked before" }).click();
  await page
    .getByTestId("picker-row")
    .filter({ hasText: "Spaghetti alla Carbonara" })
    .click();
  await expect(page.getByTestId("picker-confirm")).toContainText("Put these on");
});

test("L9 - picking hands the chef a dish and gets back a night, with provenance on the row", async ({
  page,
}) => {
  // THE ROUND TRIP (§B). The person names the dish; the chef names the night
  // and argues the PLACEMENT. This is the one spec that proves the whole chain
  // — picker → plan.pick → the chef's diff → pickedRecipeId → the eyebrow.
  await openPickerFromMeal(page);

  await page
    .getByTestId("picker-row")
    .filter({ hasText: "Congee with Ginger and Scallion" })
    .click();
  await page.getByTestId("picker-confirm").click();

  const landed = mealRow(page, PICK_LANDED_DATE());
  await expect(landed).toContainText("Congee with Ginger and Scallion", {
    timeout: 15_000,
  });
  // Provenance, as a TYPE — the same whole-eyebrow assertion L1 makes, now on a
  // pick that was actually performed rather than seeded.
  await expect(landed).toContainText("DINNER · PICKED");
  // The rationale argues the night, not the dish.
  await expect(landed).toContainText(PICK_RATIONALE);
});

test("L10 - a picked night says it was scaled, and only when it actually was", async ({
  page,
}) => {
  // BUILD DEPENDENCY 2. The seeded carbonara serves 4 and the test household
  // cooks for 2, so the chef scaled it — and `scaled to 2` says that where
  // `serves 2` would say nothing at all.
  await openPickerFromMeal(page);

  await page.getByTestId("picker-tile").filter({ hasText: "Cooked before" }).click();
  await page
    .getByTestId("picker-row")
    .filter({ hasText: "Spaghetti alla Carbonara" })
    .click();
  await page.getByTestId("picker-confirm").click();

  const landed = mealRow(page, PICK_LANDED_DATE());
  await expect(landed).toContainText("scaled to 2", { timeout: 15_000 });

  // The half that makes it mean something: a chef-proposed night in the same
  // week was not scaled, so it still reads `serves`. Without this, a meta line
  // that said "scaled to" on everything would pass the assertion above.
  await expect(mealRow(page, todayISO())).toContainText("serves 2");
});

test("L11 - the empty library does not apologise, and hands back the action that works", async ({
  page,
}) => {
  // §A, frame `3d`. The person did nothing wrong and the product works fine
  // without a library — so no illustration, no "oops", and above all no
  // disabled search.
  await seedPlanState("EMPTY");
  await page.goto("/plan");
  await page.getByTestId("library-door").click();

  await expect(page.getByText("Nothing in here yet.")).toBeVisible();
  await expect(page.getByTestId("picker-search")).toBeEnabled();
  await expect(page.getByTestId("picker-empty-primary")).toContainText(
    "Let the chef write it"
  );
  // The two doors above the primary, in priority order: the one that fills the
  // library in thirty seconds, then the one that fills it over a month.
  await expect(page.getByText("Paste a recipe or a link")).toBeVisible();
  await expect(page.getByText("Look through the recipes tab")).toBeVisible();
});

test("L12 - the picker swaps a sheet's content in place instead of stacking a second drawer", async ({
  page,
}) => {
  // The settled approach, asserted rather than assumed. D2's vaul
  // pointer-events lockup came from two drawers coexisting, and §D allows one
  // floating layer — so there must never be two drawer contents in the tree.
  await openPickerFromMeal(page);

  await expect(sheetContent(page)).toHaveCount(1);
  await expect(page.getByTestId("picker-search")).toBeVisible();

  // And closing it leaves the page usable — the exact symptom D3 guards.
  await closeButton(page).click();
  await expect(sheetContent(page)).toBeHidden();
  await mealRow(page, todayISO()).click();
  await expect(sheetContent(page)).toBeVisible();
});

// ── W8 · the intent screen's invocation ───────────────────────────────────

test("L13 - a pick made before any week exists is carried into generation", async ({
  page,
}) => {
  // The third invocation (§A). There is no plan to modify yet, so the pick is
  // held and becomes a CONSTRAINT ON GENERATION rather than a change to a week
  // — the same picker, a different verb.
  await seedPlanState("PICKABLE");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  // The draft's regenerate door — a foot link under the rail (S45 placement).
  await page.getByRole("button", { name: "Start over →" }).click();

  await page.getByTestId("library-door").click();
  await page
    .getByTestId("picker-row")
    .filter({ hasText: "Sichuan Dry-Fried Green Beans" })
    .click();
  await page.getByTestId("picker-confirm").click();

  // It is SHOWN before it is used: a choice you cannot see is a choice you
  // cannot change.
  await expect(page.getByTestId("plan-pick")).toContainText(
    "Sichuan Dry-Fried Green Beans"
  );
  await expect(page.getByTestId("picker-confirm")).toHaveCount(0);
});

test("L14 - the survival guarantee is stated before the ask, not after it", async ({
  page,
}) => {
  // §B: "picks survive a regenerate by default, AND THE GUARANTEE IS STATED
  // BEFORE THE ASK." The button below this sentence replaces the week; this is
  // the line that says what it does not replace.
  await seedPlanState("PICKED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  await page.getByRole("button", { name: "Start over →" }).click();

  await expect(page.getByTestId("picks-survive-note")).toContainText(
    "Your pick stays"
  );
});

test("L15 - picks survive a regenerate: the chef rebuilds the week, the pick stays pinned", async ({
  page,
}) => {
  // §B's guarantee, PERFORMED rather than only stated (L14 covers the sentence).
  //
  // This is the one that could rot silently. Regenerate deletes the current plan
  // outright — that is what "one active plan" means — so the picks have to be
  // read off the old week BEFORE the delete and handed to the new generation as
  // a constraint. Nothing on screen would look wrong if that stopped happening;
  // the person would just quietly get a week of the chef's own dinners and have
  // to notice their recipe was missing.
  await seedPlanState("PICKED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  await expect(mealRow(page, addDaysISO(todayISO(), 1))).toContainText(
    "Spaghetti alla Carbonara"
  );

  await page.getByRole("button", { name: "Start over →" }).click();
  await expect(page.getByTestId("picks-survive-note")).toBeVisible();
  await page.getByRole("button", { name: /let your chef figure it out/i }).click();

  // The rest of the week is freshly generated — every other night is a "Fresh …"
  // dinner, which is how the suite proves a generation actually replaced a seed.
  await expect(mealRow(page, addDaysISO(todayISO(), 1))).toContainText("Fresh", {
    timeout: 20_000,
  });

  // And the pick came through it: same recipe, still marked as the person's,
  // still carrying the scaling the chef applied.
  const pinned = mealRow(page, todayISO());
  await expect(pinned).toContainText("Spaghetti alla Carbonara");
  // `DINNER · TONIGHT · PICKED`, not `DINNER · PICKED` — the regenerated pick
  // lands on TODAY, and the eyebrow's relative label sits between the type and
  // the provenance. Asserted as the whole string it should be rather than
  // loosened to a substring: the ledger's rule is that PICKED joins the TYPE
  // LINE the way DINNER does, and a badge rendered elsewhere on the row would
  // satisfy a looser match while breaking the actual rule (same reasoning as L1,
  // whose row is not today and so has no relative label to accommodate).
  await expect(pinned).toContainText("DINNER · TONIGHT · PICKED");
  await expect(pinned).toContainText("scaled to 2");
});
