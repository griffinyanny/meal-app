// X1–X2: the modify error/retry path (Session 16, docs/test-plan.md). A modify
// genuinely fails (AI timeout / rate limit) → the user must get a reachable
// retry, not a silent dead end. Uses the [E2E:FAIL] token planted as a chip to
// force the REAL modify pipeline to throw, exercising the actual error UI.
import { test, expect } from "@playwright/test";
import {
  mealAction,
  openMealSheet,
  runMealAction,
  sheetContent,
  drawerScrim,
  planToast,
  toastAction,
  confirmBar,
  planRail,
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

// X1 was "inline-chip failure surfaces the bottom retry pill" — but the rail
// deleted the inline chip, which briefly deleted the mechanic with it: every
// modify now starts in a sheet, a failing sheet deliberately STAYS open, and
// dismissing it used to clear the error on the way out. A failure the user
// walked away from was a failure they could not get back to.
//
// W3 is the fix rather than a workaround. The error lives in the action bar's
// slot, which does not care whether a sheet is open, and dismissing a sheet no
// longer clears it. So the test is stronger than the one it replaces: it now
// asserts the failure SURVIVES the dismissal, which is the part that was broken.
test("X1 - a failure you walk away from is still reachable, in the action bar's slot", async ({
  page,
}) => {
  plan = await seedPlanState("DRAFT", { chipOverrides: { 2: [FAIL_CHIP] } });
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await runMealAction(page, plan.slots[2].date, FAIL_CHIP);

  // Walk away from the sheet the way a user would after a failure.
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();

  await expect(planToast(page)).toBeVisible({ timeout: 8_000 });
  await expect(planToast(page)).toHaveAttribute("data-tone", "error");
  await expect(planToast(page)).toContainText(RETRY_TEXT);
  // An error takes the decision's place: you cannot confirm over a failure.
  await expect(confirmBar(page)).toHaveCount(0);

  // Retry re-fires the same (still-failing) request. The slot narrates the
  // re-attempt before failing again, which is what proves it actually re-ran.
  await toastAction(page, "Retry").click();
  await expect(planToast(page)).toContainText(/^Reworking /);
  await expect(planToast(page)).toContainText(RETRY_TEXT, { timeout: 8_000 });
});

test("X2 - sheet-action failure keeps the sheet open with the retry line, actions re-enabled", async ({
  page,
}) => {
  plan = await seedPlanState("DRAFT", { chipOverrides: { 2: [FAIL_CHIP] } });
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await openMealSheet(page, plan.slots[2].date);
  const action = mealAction(page, FAIL_CHIP);
  await action.click();

  // The sheet does NOT close on failure — it stays open with the retry line and
  // re-enables its actions so the user can try again in place.
  await expect(sheetContent(page)).toBeVisible();
  await expect(sheetContent(page).getByText(RETRY_TEXT)).toBeVisible({
    timeout: 8_000,
  });
  await expect(action).toBeEnabled();
});
