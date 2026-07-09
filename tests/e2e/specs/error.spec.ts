// X1–X2: the modify error/retry path (Session 16, docs/test-plan.md). A modify
// genuinely fails (AI timeout / rate limit) → the user must get a reachable
// retry, not a silent dead end. Uses the [E2E:FAIL] token planted as a chip to
// force the REAL modify pipeline to throw, exercising the actual error UI.
import { test, expect } from "@playwright/test";
import {
  mealCard,
  cardChip,
  openCardSheet,
  sheetContent,
  errorPill,
  reviewHero,
} from "../app/selectors";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";

const FAIL_CHIP = "[E2E:FAIL] break it";
// Substring of "That didn't take — try again?" — avoids matching on the em-dash
// / apostrophe so the assertion can't flake on punctuation.
const RETRY_TEXT = "try again";

let plan: SeededPlan;

test.afterAll(async () => {
  await resetTestHousehold();
});

test("X1 - inline-chip failure surfaces the bottom retry pill, and Retry re-fires", async ({
  page,
}) => {
  plan = await seedPlanState("DRAFT", { chipOverrides: { 2: [FAIL_CHIP] } });
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();

  await cardChip(page, plan.slots[2].date, FAIL_CHIP).click();

  // No sheet was open → the error lands in the scroll-independent bottom pill.
  await expect(errorPill(page)).toBeVisible({ timeout: 8_000 });
  await expect(errorPill(page)).toContainText(RETRY_TEXT);

  // Retry re-fires the same (still-failing) request: the card re-enters its
  // in-place pending state, then the pill returns — proving the re-attempt.
  await errorPill(page).getByRole("button", { name: "Retry" }).click();
  await expect(
    mealCard(page, plan.slots[2].date).getByText(/^Reworking /)
  ).toBeVisible();
  await expect(errorPill(page)).toBeVisible({ timeout: 8_000 });
});

test("X2 - sheet-action failure keeps the sheet open with the retry line, actions re-enabled", async ({
  page,
}) => {
  plan = await seedPlanState("DRAFT", { chipOverrides: { 2: [FAIL_CHIP] } });
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();

  await openCardSheet(page, plan.slots[2].date);
  const action = sheetContent(page).getByRole("button", {
    name: FAIL_CHIP,
    exact: true,
  });
  await action.click();

  // The sheet does NOT close on failure — it stays open with the retry line and
  // re-enables its actions so the user can try again in place.
  await expect(sheetContent(page)).toBeVisible();
  await expect(sheetContent(page).getByText(RETRY_TEXT)).toBeVisible({
    timeout: 8_000,
  });
  await expect(action).toBeEnabled();
});
