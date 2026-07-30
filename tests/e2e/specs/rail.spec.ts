// P1–P8: the rebuilt rail (Phase 1E.5 · W1/W2/W4/W5/W7). These are the rules the
// ledger's §C/§D make structural — the ones a screenshot alone cannot prove and
// a unit test cannot reach, because they are about what the DOM actually renders
// at a given density and status.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";
import {
  planRail,
  mealRow,
  openMealSheet,
  sheetContent,
  sheetTitle,
  confirmBar,
  planToast,
  CHEF_VOICE_GOLD,
} from "../app/selectors";

test.afterAll(async () => {
  await resetTestHousehold();
});

// Every gold italic line on the rail — the chef's rationales. Read off computed
// style so the count is of what a reader actually SEES as the chef speaking,
// not of a class name that might or might not be painting anything.
function goldVoiceCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate((gold) => {
    const rail = document.querySelector('[data-testid="plan-rail"]');
    if (!rail) return -1;
    return [...rail.querySelectorAll<HTMLElement>("p")].filter((el) => {
      const s = getComputedStyle(el);
      return s.fontStyle === "italic" && s.color.includes(gold);
    }).length;
  }, CHEF_VOICE_GOLD);
}

test("P1 - days are containers and meals are inset rows", async ({ page }) => {
  const plan: SeededPlan = await seedPlanState("DENSE");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  // Fifteen meals across five days. Every row lives inside its day, which is
  // what lets fifteen fit the scroll five dinners used to need.
  await expect(page.locator("[data-meal-date]")).toHaveCount(15);
  const distinctDays = new Set(plan.slots.map((s) => s.date));
  expect(distinctDays.size).toBe(5);
  await expect(page.locator("[data-day-date]")).toHaveCount(5);
});

test("P2 - only dinner carries a rationale, at every density", async ({ page }) => {
  // THE mechanism that holds the surface inside law 06. Fifteen meals produce
  // five gold marks, not fifteen — and the seed deliberately gives lunch and
  // breakfast a rationale each, so this fails if the row prints what it is given
  // rather than what its meal type is allowed to say.
  await seedPlanState("DENSE");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  expect(await goldVoiceCount(page)).toBe(5);
});

test("P3 - the meta row is one cook time and one serving count (BUG-008)", async ({
  page,
}) => {
  // The ADVERSARIAL seed's day 0 carries estTimeMinutes 95 AND a "90 min" tag —
  // the exact shape that used to print two different cook times on one card.
  // A time-shaped tag is DROPPED, not deduped: a card can honestly state one
  // cook time, and estTimeMinutes is the structured one.
  await seedPlanState("ADVERSARIAL");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  const row = mealRow(page, (await seedDates(page))[0]!);
  await expect(row).toContainText("1 hr 35 min");
  await expect(row).not.toContainText("90 min");
});

test("P4 - a slot with no answer is provisional, not loading, and confirm stays live (BUG-009)", async ({
  page,
}) => {
  await seedPlanState("PROVISIONAL");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  // The sentence names its dependency instead of saying "Thinking…".
  await expect(planRail(page)).toContainText("Friday, after Wednesday");
  await expect(planRail(page)).not.toContainText("Thinking");
  // NEVER a spinner: nothing on the rail is animating a wait.
  const spinners = await page.locator('[data-testid="plan-rail"] .animate-spin').count();
  expect(spinners).toBe(0);
  // YOU CAN CONFIRM A WEEK WITH A HOLE IN IT. The count says four, not five,
  // so the undecided night can't be mistaken for something the shop covers.
  await expect(confirmBar(page)).toBeVisible();
  await expect(confirmBar(page)).toContainText("Confirm 4 dinners");
  // ONE CONTROL, and it is an ask rather than a form — "Leave it to me" was cut.
  const decide = planRail(page).getByRole("button", { name: "Decide now" });
  await expect(decide).toHaveCount(1);
  await decide.click();
  // The slot narrates the chef working, which is the whole point of W3.
  await expect(planToast(page)).toBeVisible({ timeout: 10_000 });
});

test("P9 - the absence the rail states carries the one control that changes it", async ({
  page,
}) => {
  // §D: the gap is acknowledged once, at the bottom, "with the one control that
  // changes it". A confirmed week is where adding a night is a real edit — on a
  // draft the gap is just something unfinished, so the control is not offered.
  await seedPlanState("CONFIRMED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await expect(planRail(page)).toContainText("not planned");
  await expect(planRail(page).getByRole("button", { name: "Add days" })).toBeVisible();

  // And a night you're out of gets its own way back in.
  await seedPlanState("CHOSEN_DAYS");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  await expect(planRail(page).getByRole("button", { name: "Add a night" })).toHaveCount(0);
});

test("P5 - a week is the days you chose: absence is stated once, at the bottom", async ({
  page,
}) => {
  await seedPlanState("CHOSEN_DAYS");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  // Four days exist as rail entries (three cooking + one out); the rest of the
  // span is NOT drawn as empty rows.
  await expect(page.locator("[data-meal-date]")).toHaveCount(4);
  // And the gap is acknowledged exactly once, in words.
  await expect(planRail(page)).toContainText("not planned");
  await expect(page.getByText(/not planned/)).toHaveCount(1);
});

test("P6 - draft and confirmed are different screens", async ({ page }) => {
  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  // A draft asks for a decision, argues for its placements, and offers a re-prompt.
  await expect(confirmBar(page)).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  expect(await goldVoiceCount(page)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /Start over/ })).toBeVisible();

  await seedPlanState("CONFIRMED");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();
  // THE DECISION WAS SPENT: no floating action at all, no arguments left on the
  // rows, the list where the argument used to be, and meta reading Set.
  await expect(confirmBar(page)).toHaveCount(0);
  await expect(page.getByText("Set", { exact: true })).toBeVisible();
  expect(await goldVoiceCount(page)).toBe(0);
  await expect(page.getByRole("link", { name: /grocery list|things to buy/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start over/ })).toHaveCount(0);
});

test("P7 - tapping a day opens the day sheet; tapping a meal opens the meal sheet", async ({
  page,
}) => {
  const plan = await seedPlanState("DENSE");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  // The day. Its sheet lists what is on it, so its rows are the day's meals.
  await page.locator(`[data-day-date="${plan.slots[0]!.date}"]`).click();
  await expect(sheetContent(page)).toBeVisible();
  await expect(sheetContent(page)).toContainText("ON THIS DAY");
  await expect(sheetContent(page)).toContainText("3 meals planned");

  // The same shell with the first line and the primary swapped: a meal row from
  // inside the day sheet hands off to the meal sheet.
  await sheetContent(page).getByRole("button", { name: /Lunch/ }).click();
  await expect(sheetTitle(page)).toContainText("Lunch");
  await expect(sheetContent(page)).not.toContainText("ON THIS DAY");
});

test("P8 - the meal sheet is a summary, not a recipe (BUG-006)", async ({ page }) => {
  const plan = await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(planRail(page)).toBeVisible();

  await openMealSheet(page, plan.slots[1]!.date);
  await expect(sheetContent(page)).toBeVisible();

  // INGREDIENTS AND STEPS NEVER ENTER PLAN. The sheet argues for the dish and
  // offers one row out to the place that owns the recipe.
  await expect(sheetContent(page)).toContainText("ASK ME FOR A CHANGE");
  await expect(sheetContent(page)).toContainText("TAKE IT SOMEWHERE");
  await expect(sheetContent(page)).not.toContainText("Ingredients");
  await expect(sheetContent(page)).not.toContainText(/^Steps$/);
  // The recipe row states its own state rather than offering a dead door.
  await expect(sheetContent(page)).toContainText(/full recipe/);
});

// The seeded dates, read off the rendered rail in document order.
async function seedDates(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-meal-date]")].map(
      (el) => el.dataset.mealDate ?? ""
    )
  );
}
