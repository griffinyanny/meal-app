// E1–E4: the elapsed-plan "week wrapped" state (Session 16, docs/test-plan.md).
// When every day of a plan is already past, invite a fresh week (a chef
// check-in) instead of the nonsensical mid-week "adjust the rest of the week"
// view. Seeds ELAPSED_CONFIRMED / ELAPSED_DRAFT (both anchor 8 days ago).
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold } from "../app/seed";
import { intentHeading } from "../app/selectors";

const likeButtons = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Liked it" });

test.afterAll(async () => {
  await resetTestHousehold();
});

test("E1 - confirmed & all-past → 'week wrapped' recap, not the mid-week view", async ({
  page,
}) => {
  await seedPlanState("ELAPSED_CONFIRMED");
  await page.goto("/plan");

  await expect(
    page.getByRole("heading", { name: "That's a wrap on this week." })
  ).toBeVisible();
  // 7 seeded cookable dinners → "You cooked 7 dinners…".
  await expect(page.getByText(/You cooked 7 dinners/)).toBeVisible();
  // The thumbs recap is present (one Liked/Didn't-like pair per cooked day).
  await expect(likeButtons(page)).toHaveCount(7);
  await expect(page.getByRole("button", { name: /Plan next week/ })).toBeVisible();
  // NOT the mid-week layout.
  await expect(page.getByText("EARLIER THIS WEEK")).toHaveCount(0);
});

test("E2 - a thumbs rating in the recap toggles and persists across reload", async ({
  page,
}) => {
  await seedPlanState("ELAPSED_CONFIRMED");
  await page.goto("/plan");

  const firstLike = likeButtons(page).first();
  await firstLike.click();
  await expect(firstLike).toHaveClass(/text-primary/);
  // Wait for the write to land before reloading, then confirm it stuck.
  await page.waitForResponse((r) => r.url().includes("plan.feedback"));
  await page.reload();
  await expect(likeButtons(page).first()).toHaveClass(/text-primary/);
});

test("E3 - draft & all-past → 'gone stale' variant, no thumbs recap", async ({
  page,
}) => {
  await seedPlanState("ELAPSED_DRAFT");
  await page.goto("/plan");

  await expect(
    page.getByRole("heading", { name: "This plan's gone stale." })
  ).toBeVisible();
  // Stale draft has no "how'd it go" recap.
  await expect(likeButtons(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Plan next week/ })).toBeVisible();
});

test("E4 - 'Plan next week →' opens the intent screen", async ({ page }) => {
  await seedPlanState("ELAPSED_CONFIRMED");
  await page.goto("/plan");

  await page.getByRole("button", { name: /Plan next week/ }).click();
  await expect(intentHeading(page)).toBeVisible();
});
