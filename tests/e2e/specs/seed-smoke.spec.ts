import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { planRail, mealRow } from "../app/selectors";

// Validates the seed path end-to-end: DRAFT → the rail with a row per seeded day.
test.afterAll(async () => {
  await resetTestHousehold();
});

test("seed DRAFT renders the rail with a row per seeded day", async ({ page }) => {
  const plan = await seedPlanState("DRAFT");
  await page.goto("/plan");

  await expect(planRail(page)).toBeVisible();

  for (const slot of plan.slots) {
    await expect(mealRow(page, slot.date)).toBeVisible();
  }
});
