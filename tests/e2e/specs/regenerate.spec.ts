// RG1–RG5: regenerate / "start over" (docs/test-plan.md, formerly Test 8 — the
// V1 blocker). Proves the intent-screen airlock, the confirmed-plan replace
// warning, non-destructive cancel, true one-active-plan replacement through the
// REAL persist pipeline, and the RG5 stale-modify token guard.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { intentHeading, reviewHero, cardChip, ackPill, errorPill } from "../app/selectors";
import { FRESH_TITLE_PREFIX } from "../../../src/server/ai/providers/e2e-mock-fixtures";

const REPLACE_WARNING = "Generating a new plan will replace this week's meals.";
const FRESH = new RegExp(`^${FRESH_TITLE_PREFIX} `);
const SEEDED = /^Seeded /;

test.afterAll(async () => {
  await resetTestHousehold();
});

test("RG1 - draft: Start over → intent screen, no replace warning", async ({
  page,
}) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();

  await page.getByRole("button", { name: /Start over/ }).click();

  await expect(intentHeading(page)).toBeVisible();
  await expect(page.getByRole("button", { name: /Keep current plan/ })).toBeVisible();
  await expect(page.getByText(REPLACE_WARNING)).toHaveCount(0);
});

test("RG2 - confirmed: Plan a new week → intent screen WITH replace warning", async ({
  page,
}) => {
  await seedPlanState("MIDWEEK");
  await page.goto("/plan");
  const newWeek = page.getByRole("button", { name: /Plan a new week/ });
  await expect(newWeek).toBeVisible();

  await newWeek.click();

  await expect(intentHeading(page)).toBeVisible();
  await expect(page.getByText(REPLACE_WARNING)).toBeVisible();
});

test("RG3 - Keep current plan returns to the unchanged plan", async ({ page }) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();

  await page.getByRole("button", { name: /Start over/ }).click();
  await expect(intentHeading(page)).toBeVisible();
  await page.getByRole("button", { name: /Keep current plan/ }).click();

  await expect(reviewHero(page)).toBeVisible();
  await expect(page.getByText(SEEDED).first()).toBeVisible();
});

test("RG4 - generate fully replaces the old plan (one active plan)", async ({
  page,
}) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();
  await expect(page.getByText(SEEDED).first()).toBeVisible();

  await page.getByRole("button", { name: /Start over/ }).click();
  await expect(intentHeading(page)).toBeVisible();
  await page.getByRole("button", { name: "Healthy weeknight dinners" }).click();

  // Streams a new plan, then settles onto the persisted (Fresh) review.
  await expect(reviewHero(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(FRESH).first()).toBeVisible();
  await expect(page.getByText(SEEDED)).toHaveCount(0);
});

test("RG5 - a stale modify cannot overwrite a freshly generated plan", async ({
  page,
}) => {
  const SLOW_CHIP = "[E2E:SLOW=6000] rework it";
  const plan = await seedPlanState("DRAFT", { chipOverrides: { 1: [SLOW_CHIP] } });
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();

  // Fire a slow (6s) inline modify, then immediately regenerate before it lands.
  await cardChip(page, plan.slots[1].date, SLOW_CHIP).click();
  await page.getByRole("button", { name: /Start over/ }).click();
  await expect(intentHeading(page)).toBeVisible();
  await page.getByRole("button", { name: "Healthy weeknight dinners" }).click();
  await expect(reviewHero(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(FRESH).first()).toBeVisible();

  // Let the stale modify resolve; the token guard must keep it from clobbering.
  await page.waitForTimeout(6_500);
  await expect(page.getByText(/^Reworked /)).toHaveCount(0);
  await expect(page.getByText(SEEDED)).toHaveCount(0);
  await expect(ackPill(page)).toHaveCount(0);
  await expect(errorPill(page)).toHaveCount(0);
});
