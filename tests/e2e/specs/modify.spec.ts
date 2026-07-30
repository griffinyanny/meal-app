// M1–M7: the app-wide modify affordance (docs/test-plan.md), migrated to the
// 1E.5 rail (BUG-024).
//
// The affordance itself did not weaken — it moved. Session 16 put the chips on
// the card and the "Reworking …" label inside it; §C of the decisions ledger
// makes the meal ROW the unit of change feedback (a gold ring on its own 14px
// radius) and sends the chef's sentence to the action bar's slot, because a
// compact row cannot host it at the density the rail now supports. So every
// modify starts in the meal sheet, and the row is what answers.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";
import {
  mealRow,
  mealAction,
  openMealSheet,
  runMealAction,
  sheetContent,
  drawerScrim,
  goldRingedDates,
  rowAnimation,
  planToast,
  toastAction,
  confirmBar,
  planRail,
  talkToChef,
  CHEF_GOLD,
} from "../app/selectors";

const REWORKED = /^Reworked /;

// A chip that holds the modify open long enough for the working state to be
// observed deterministically, rather than racing the mock's 700ms latency.
const SLOW_CHIP = "[E2E:SLOW=3000] rework it";

function utcWeekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

let plan: SeededPlan;

async function seedDraft(
  page: import("@playwright/test").Page,
  opts?: Parameters<typeof seedPlanState>[1]
) {
  plan = await seedPlanState("DRAFT", opts);
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
}

test.afterAll(async () => {
  await resetTestHousehold();
});

test("M1 - the changed ROW is the unit of feedback: gold working ring, then the landed ring", async ({
  page,
}) => {
  await seedDraft(page, { chipOverrides: { 2: [SLOW_CHIP] } });
  const date = plan.slots[2].date;

  await runMealAction(page, date, SLOW_CHIP);

  // While the chef works: the ring is on THAT row, on its own radius, and it is
  // gold — §C's rule is the colour as much as the placement, so this reads the
  // computed shadow rather than a class name.
  await expect
    .poll(() => goldRingedDates(page), { timeout: 5_000 })
    .toEqual([date]);
  // Never the day container: only the row carries it.
  expect(await mealRow(page, date).evaluate((el) => el.tagName)).toBe("BUTTON");

  // When it lands: the sheet closes onto the row, the row holds the one-shot
  // landed ring, and the new content is there.
  await expect(sheetContent(page)).toBeHidden({ timeout: 10_000 });
  await expect
    .poll(() => rowAnimation(page, date), { timeout: 2_000 })
    .toContain("landedRing");
  await expect(mealRow(page, date).getByText(REWORKED)).toBeVisible();
});

test("M2 - sheet action: sheet stays open pending, then closes onto the changed row", async ({
  page,
}) => {
  await seedDraft(page);
  const date = plan.slots[2].date;
  await openMealSheet(page, date);
  await expect(sheetContent(page)).toBeVisible();

  const action = mealAction(page, "Make it spicier");
  await action.click();

  // Sheet STAYS open, shows pending, actions disabled.
  await expect(sheetContent(page).getByText(/^Reworking /)).toBeVisible();
  await expect(action).toBeDisabled();

  // On success the sheet closes onto the changed row.
  await expect(sheetContent(page)).toBeHidden({ timeout: 10_000 });
  await expect(mealRow(page, date).getByText(REWORKED)).toBeVisible();
});

test("M3 - meal-scoped chat changes ONLY that day (scope anchor)", async ({
  page,
}) => {
  await seedDraft(page);
  const date = plan.slots[2].date;
  await openMealSheet(page, date);
  await sheetContent(page)
    .getByRole("button", { name: /Something else\? Tell your chef/ })
    .click();

  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make it spicy");
  await page.getByRole("button", { name: "Send to chef" }).click();

  // Only the targeted day changes.
  await expect(mealRow(page, date).getByText(REWORKED)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(REWORKED)).toHaveCount(1);
});

test("M4 - whole-week chat → the toast carries the chef's sentence and jumps to the first changed day", async ({
  page,
}) => {
  await seedDraft(page);
  await talkToChef(page).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make this week lighter");
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(planToast(page)).toBeVisible({ timeout: 10_000 });
  await expect(planToast(page)).toContainText("lightened up two dinners");
  // THE BAR BECOMES THE MESSAGE (§C): they never coexist.
  await expect(confirmBar(page)).toHaveCount(0);

  // Whole-week mock reworks offsets 1 & 3; the toast jumps to the first.
  await toastAction(page, "Show me").click();
  await expect(mealRow(page, plan.slots[1].date)).toBeInViewport();
  // And the slot hands itself back once the news is spent.
  await expect(confirmBar(page)).toBeVisible();
});

test("M5 - the toast takes the action bar's exact box, and hands it back", async ({
  page,
}) => {
  await seedDraft(page);

  // The geometry §C actually specifies: the toast inherits the primary's box so
  // the transition reads as ONE object changing its contents, not two objects
  // trading places through the same air. Measured, not eyeballed.
  const barBox = (await confirmBar(page).boundingBox())!;

  await talkToChef(page).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make this week lighter");
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(planToast(page)).toBeVisible({ timeout: 10_000 });
  const toastBox = (await planToast(page).boundingBox())!;

  expect(toastBox.x).toBeCloseTo(barBox.x, 0);
  expect(toastBox.y).toBeCloseTo(barBox.y, 0);
  expect(toastBox.width).toBeCloseTo(barBox.width, 0);
  expect(toastBox.height).toBeCloseTo(barBox.height, 0);

  // Still bottom-anchored — never a top toast a scrolled-down user can't see.
  expect(toastBox.y).toBeGreaterThan(page.viewportSize()!.height / 2);
});

test("M6 - one modify at a time: the chef's actions go inert everywhere while one is in flight", async ({
  page,
}) => {
  await seedDraft(page, { chipOverrides: { 1: [SLOW_CHIP] } });
  const busy = plan.slots[1].date;
  const other = plan.slots[2].date;

  await runMealAction(page, busy, SLOW_CHIP);
  await expect(mealAction(page, SLOW_CHIP)).toBeDisabled();

  // Leave the sheet and go at a different day. Its actions are inert too — one
  // active plan means one active modify, and the rule is expressed in the UI
  // rather than enforced by a silently-dropped tap.
  await drawerScrim(page).click({ position: { x: 10, y: 10 } });
  await expect(sheetContent(page)).toBeHidden();
  await openMealSheet(page, other);
  await expect(mealAction(page, "Make it spicier")).toBeDisabled();

  // And the ring never spreads: exactly one row is being worked on.
  expect(await goldRingedDates(page)).toEqual([busy]);
});

test("M7 - eating out clears that day to an absent rail row, not a card", async ({
  page,
}) => {
  await seedDraft(page);
  const target = plan.slots[2];
  const dayName = utcWeekday(target.date);
  const clearedTitle = target.title!;

  await talkToChef(page).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill(`we're eating out ${dayName.toLowerCase()}`);
  await page.getByRole("button", { name: "Send to chef" }).click();

  // A CONTAINER NEEDS CONTENTS (§D): a night you're out is a 56px rail row with
  // no surface — never an empty card, never a dashed box.
  const row = mealRow(page, target.date);
  await expect(row.getByText("You're out")).toBeVisible({ timeout: 10_000 });
  // The day genuinely cleared rather than just being restyled.
  await expect(page.getByText(clearedTitle)).toHaveCount(0);
  // And it is not a tappable meal row any more.
  await expect(row.locator("button")).toHaveCount(0);
  // No gold anywhere: clearing a night is not the chef rewriting a dish.
  expect(await row.evaluate((el) => getComputedStyle(el).boxShadow)).not.toContain(
    CHEF_GOLD
  );
});
