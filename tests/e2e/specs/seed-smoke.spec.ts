import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";

// Validates the seed path end-to-end: DRAFT → review screen with a card per day.
test.afterAll(async () => {
  await resetTestHousehold();
});

test("seed DRAFT renders a review with a card per seeded day", async ({ page }) => {
  const plan = await seedPlanState("DRAFT");
  await page.goto("/plan");

  await expect(
    page.getByRole("heading", { name: "Your week, ready to review" })
  ).toBeVisible();

  for (const slot of plan.slots) {
    await expect(page.locator(`[data-meal-date="${slot.date}"]`)).toBeVisible();
  }
});
