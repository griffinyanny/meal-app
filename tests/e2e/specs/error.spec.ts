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
import { FRESH_TITLE_PREFIX } from "../../../src/server/ai/providers/e2e-mock-fixtures";

const FAIL_CHIP = "[E2E:FAIL] break it";
// Substring of "That didn't take — try again?" — avoids matching on the em-dash
// / apostrophe so the assertion can't flake on punctuation.
const RETRY_TEXT = "try again";

// BUG-035 (X3/X4). The same directive, aimed at GENERATION rather than modify.
// X1/X2 above only ever cover a modify failure, which is why the generation
// path shipped five phases without anyone knowing what it renders.
const FAIL_REQUEST = "[E2E:FAIL] plan my week";
// Substring of "The chef got stuck putting your plan together." — the one
// string both failure surfaces share, so a copy change breaks both together.
const GENERATION_FAILED = "got stuck";
const SEEDED_TITLES = /^Seeded /;
const FRESH_TITLES = new RegExp(`^${FRESH_TITLE_PREFIX} `);

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

// Types a request carrying the failure directive into the intent screen's own
// textarea and sends it. Goes through the REAL generation pipeline — the route,
// streamObject, and the client's stream consumption — rather than stubbing the
// response, because the open question in BUG-035 is precisely whether a stream
// that dies mid-pipe surfaces to the client at all.
async function generateAndFail(page: import("@playwright/test").Page) {
  await page
    .getByPlaceholder("Or just start talking. What sounds good?")
    .fill(FAIL_REQUEST);
  await page.getByRole("button", { name: "Send to chef" }).click();
}

// X3 — the control case. This path was already correct (`streamError && !plan`
// is satisfied on a first run), so X3 is here to pin it: it must keep working
// after X4's fix moves the guard.
test("X3 - first run: a failed generation is named, with a retry", async ({
  page,
}) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");

  await generateAndFail(page);

  await expect(page.getByText(GENERATION_FAILED)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible();
});

// X4 — BUG-035's real defect, and the reason this spec exists.
//
// `renderBody` gated the failure card on `streamError && !plan`, and a timeout
// never reaches `persistPlan` (it runs in onComplete), so the OLD plan survives
// in the DB and `plan` stays truthy. The failure branch was therefore
// unreachable on every regenerate: you asked for a new week, waited out the
// timeout, and last week's plan silently reappeared with nothing said.
//
// A silent no-op, which is the same class as BUG-019's dropped drag — and the
// MORE likely path in real use, since after week one you always have a plan.
//
// Both halves are asserted because either alone is satisfiable by the wrong
// fix: naming the error while dropping the week you already had is Griffin's
// rejected option (a).
test("X4 - regenerate: a failed generation is named AND the week you had survives", async ({
  page,
}) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  await expect(page.getByText(SEEDED_TITLES).first()).toBeVisible();

  await page.getByRole("button", { name: /Start over/ }).click();
  await expect(page.getByPlaceholder("Or just start talking. What sounds good?")).toBeVisible();

  await generateAndFail(page);

  // The failure is named and reachable.
  await expect(page.getByText(GENERATION_FAILED)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible();
  // ...and it did NOT cost the user the week they already had (option B).
  await expect(planRail(page)).toBeVisible();
  await expect(page.getByText(SEEDED_TITLES).first()).toBeVisible();
});

// X5 — the retry Griffin asked for, proven to be INVISIBLE when it works.
//
// `[E2E:FAIL_ONCE]` kills the first attempt only. If the server-side retry is
// wired, the person never learns any of this happened: they get a week, and no
// failure is ever named. Deleting `withStreamRetry` fails this test.
test("X5 - a first attempt that dies is retried server-side, and the user just gets their week", async ({
  page,
}) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");

  await page
    .getByPlaceholder("Or just start talking. What sounds good?")
    .fill("[E2E:FAIL_ONCE=x5] plan my week");
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(page.getByText(FRESH_TITLES).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(GENERATION_FAILED)).toHaveCount(0);
});

// X6 — the timeout itself, driven for real rather than simulated with an error.
//
// The suite's per-attempt bound is 2.5s (playwright.config.ts); the request
// stalls for 20s, so BOTH attempts blow through it and the user must land on
// the named failure. This is the specific behaviour BUG-035 was opened not
// knowing: a stall that produces nothing had to become either a named failure
// or a spinner that never resolves, and nobody had made it be the first one.
test("X6 - a generation that stalls past both attempts ends as a named failure, not a spinner", async ({
  page,
}) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");

  await page
    .getByPlaceholder("Or just start talking. What sounds good?")
    .fill("[E2E:SLOW=20000] plan my week");
  await page.getByRole("button", { name: "Send to chef" }).click();

  // Two 2.5s attempts, then the failure — comfortably inside this budget, and
  // nowhere near the 20s the mock would have stalled for if the bound were dead.
  await expect(page.getByText(GENERATION_FAILED)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible();
});
