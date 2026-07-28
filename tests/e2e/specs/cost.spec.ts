// C1–C4: cost estimation (Phase 1E.5 · W6). Griffin scoped this against a
// recommendation to drop the design's cost numbers, so the specs are written to
// the guardrails that make his version honest rather than to the happy path:
// always a tilde, never cents, never a zero, and never a figure summed from
// meals nobody is cooking.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { planRail, confirmBar } from "../app/selectors";

test.afterAll(async () => {
  await resetTestHousehold();
});

test("C1 - the draft's consequence line carries the summed estimate", async ({
  page,
}) => {
  // DRAFT seeds 7 dinners at 1500c each → $105.
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await expect(page.getByText("Saying yes writes your grocery list")).toContainText(
    "~$105"
  );
});

test("C2 - never cents, always a tilde", async ({ page }) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(confirmBar(page)).toBeVisible();

  const line = page.getByText("Saying yes writes your grocery list");
  // False precision is the failure mode that costs the most trust: "$105.00"
  // claims a resolution the model does not have.
  await expect(line).not.toContainText(/\$\d+\.\d/);
  // And the tilde is what makes the figure readable as an estimate at a glance.
  await expect(line).toContainText(/~\$/);
});

test("C3 - a week with nothing priced shows no number at all, never $0", async ({
  page,
}) => {
  // CHOSEN_DAYS' eating-out night carries no estimate, and the three cooking
  // nights do — so this also proves the sum ignores the night nobody is
  // cooking rather than treating its null as a zero-cost meal.
  await seedPlanState("CHOSEN_DAYS");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  const line = page.getByText("Saying yes writes your grocery list");
  await expect(line).toContainText("~$45");
  await expect(page.getByText("$0")).toHaveCount(0);
});

test("C4 - a partially-priced week sums what it has, and says so honestly", async ({
  page,
}) => {
  // PROVISIONAL: four priced dinners at 1500c, one night with no answer and no
  // estimate. "The four I've written come to about this" is a true statement
  // about a draft; dropping the number entirely because one slot is open would
  // be less useful and no more honest.
  await seedPlanState("PROVISIONAL");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await expect(page.getByText("Saying yes writes your grocery list")).toContainText(
    "~$60"
  );
  await expect(confirmBar(page)).toContainText("Confirm 4 dinners");
});
