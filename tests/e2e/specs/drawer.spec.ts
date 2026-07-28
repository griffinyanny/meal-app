// D1–D7: drawer dismissal (docs/test-plan.md). The highest-risk, un-click-tested
// surface from Session 16 — especially D3, the two-drawer pointer-lockup
// regression. Seeds DRAFT (the draft rail, every meal row tappable).
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";
import {
  openMealSheet,
  sheetContent,
  sheetTitle,
  drawerScrim,
  closeButton,
  planRail,
  dragSheetDown,
} from "../app/selectors";

let plan: SeededPlan;

test.beforeEach(async ({ page }) => {
  plan = await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
});

test.afterAll(async () => {
  await resetTestHousehold();
});

test("D1 - X button closes the sheet", async ({ page }) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await closeButton(page).click();
  await expect(sheetContent(page)).toBeHidden();
});

test("D2 - tapping the scrim outside the sheet closes it", async ({ page }) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  // Tap near the top of the scrim, well above the bottom sheet content.
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();
});

test("D3 - after outside-tap close, tapping another card still opens (no lockup)", async ({
  page,
}) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();

  // The regression: vaul left document.body pointer-events:none, killing taps.
  const bodyPointerEvents = await page.evaluate(
    () => getComputedStyle(document.body).pointerEvents
  );
  expect(bodyPointerEvents).not.toBe("none");

  // And a fresh card tap must actually open that card's sheet.
  await openMealSheet(page, plan.slots[3].date);
  await expect(sheetContent(page)).toBeVisible();
  await expect(sheetTitle(page)).toHaveText(plan.slots[3].title ?? "");
});

test("D4 - drag the handle down to dismiss", async ({ page }) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await dragSheetDown(page, 420);
  await expect(sheetContent(page)).toBeHidden();
});

test("D5 - Escape closes the sheet", async ({ page }) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheetContent(page)).toBeHidden();
});

test("D6 - heading precedes the Close control in DOM (AT order)", async ({
  page,
}) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  const order = await page.evaluate(() => {
    const title = document.querySelector('[data-slot="drawer-title"]');
    const close = document.querySelector('[data-slot="drawer-close"]');
    if (!title || !close) return "missing";
    return title.compareDocumentPosition(close) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? "title-first"
      : "close-first";
  });
  expect(order).toBe("title-first");
});

// D7 — RESOLVED (Griffin, Session 17): ACCEPT background scroll. modal={false} +
// noBodyStyles (the D3 pointer-lockup fix) intentionally leaves the page
// scrollable while a sheet is open, and Griffin confirmed he wants both a
// scrollable background AND click-outside (D2). This guards that the page is
// NOT scroll-locked — a regression to a scroll-lock would fail here.
test("D7 - background scrolls freely while a sheet is open (accepted trade)", async ({
  page,
}) => {
  await openMealSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeGreaterThan(before);
});
