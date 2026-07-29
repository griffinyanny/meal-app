// L — library into plan (Phase 1E.5 · Slice 2).
//
// Slice 2's entry points (W8's picker, W10's `Add to this week`) are not built
// yet. What IS built is the provenance spine — the `pickedRecipeId` column and
// the eyebrow it drives — so these specs seed a pick rather than perform one.
// That is deliberate: the ledger's provenance rule is a claim about RENDERING
// ("provenance is type, not chrome"), and it is true or false independently of
// how the pick got there. Testing it now means the picker lands next session
// against coverage that already exists, instead of shipping both at once and
// finding out which half is wrong.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { planRail, mealRow } from "../app/selectors";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";

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
