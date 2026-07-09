// Verifies the dev debug HUD: off by default (prod-safe), enable-able at runtime
// via the localStorage flag, toggles open, publishes live Plan-tab state, and
// copies a JSON snapshot to the clipboard.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";

test.afterAll(async () => {
  await resetTestHousehold();
});

test("HUD is absent by default (no flag) — prod-safe", async ({ page }) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");
  await expect(page.getByTestId("debug-hud-toggle")).toHaveCount(0);
});

test("HUD toggles, publishes plan state, and copies a snapshot", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => localStorage.setItem("debug-hud", "1"));

  await seedPlanState("DRAFT");
  await page.goto("/plan");

  const toggle = page.getByTestId("debug-hud-toggle");
  await expect(toggle).toBeVisible();
  await expect(page.getByTestId("debug-hud-panel")).toBeHidden();

  await toggle.click();
  const panel = page.getByTestId("debug-hud-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('"derivedState": "review"');
  await expect(panel).toContainText('"status": "draft"');

  await page.getByTestId("debug-hud-copy").click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("derivedState");
  expect(clip).toContain("todayUTC");
});
