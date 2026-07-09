// D1–D7: drawer dismissal (docs/test-plan.md). The highest-risk, un-click-tested
// surface from Session 16 — especially D3, the two-drawer pointer-lockup
// regression. Seeds DRAFT (review screen, all cards tappable).
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";
import {
  openCardSheet,
  sheetContent,
  sheetTitle,
  drawerScrim,
  closeButton,
  reviewHero,
  dragSheetDown,
} from "../app/selectors";

let plan: SeededPlan;

test.beforeEach(async ({ page }) => {
  plan = await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();
});

test.afterAll(async () => {
  await resetTestHousehold();
});

test("D1 - X button closes the sheet", async ({ page }) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await closeButton(page).click();
  await expect(sheetContent(page)).toBeHidden();
});

test("D2 - tapping the scrim outside the sheet closes it", async ({ page }) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  // Tap near the top of the scrim, well above the bottom sheet content.
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();
});

test("D3 - after outside-tap close, tapping another card still opens (no lockup)", async ({
  page,
}) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();

  // The regression: vaul left document.body pointer-events:none, killing taps.
  const bodyPointerEvents = await page.evaluate(
    () => getComputedStyle(document.body).pointerEvents
  );
  expect(bodyPointerEvents).not.toBe("none");

  // And a fresh card tap must actually open that card's sheet.
  await openCardSheet(page, plan.slots[3].date);
  await expect(sheetContent(page)).toBeVisible();
  await expect(sheetTitle(page)).toHaveText(plan.slots[3].title ?? "");
});

test("D4 - drag the handle down to dismiss", async ({ page }) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await dragSheetDown(page, 420);
  await expect(sheetContent(page)).toBeHidden();
});

test("D5 - Escape closes the sheet", async ({ page }) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheetContent(page)).toBeHidden();
});

test("D6 - heading precedes the Close control in DOM (AT order)", async ({
  page,
}) => {
  await openCardSheet(page, plan.slots[1].date);
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

// FINDING (Session 17): this FAILS today — the background DOES scroll while a
// sheet is open (scrollY 0 → 600). The Session 16 notes claimed the scrim blocks
// background scroll, but modal={false} + noBodyStyles (the fix for the D3
// pointer-lockup) means nothing prevents the window from scrolling. Marked fixme
// pending Griffin's call: accept scrolling (the trade for click-outside), or
// re-lock via onWheel/onTouchMove preventDefault on the scrim (does NOT need to
// reintroduce body pointer-events, so it won't regress D3). Un-fixme when decided.
test.fixme(
  "D7 - background does not scroll while the sheet is open",
  async ({ page }) => {
  await openCardSheet(page, plan.slots[1].date);
  await expect(sheetContent(page)).toBeVisible();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBe(before);
  }
);
