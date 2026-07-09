// M1–M7: the Session 16 app-wide modify affordance (docs/test-plan.md). In-place
// pending on the thing you touched, sheets that stay open then close on success,
// scope anchoring, the whole-week ack pill, no top-of-page toast, single active
// modify, and the eating-out day. Seeds DRAFT.
import { test, expect } from "@playwright/test";
import { seedPlanState, resetTestHousehold, type SeededPlan } from "../app/seed";
import {
  mealCard,
  cardChip,
  openCardSheet,
  sheetContent,
  ackPill,
  reviewHero,
} from "../app/selectors";

const REWORKED = /^Reworked /;

function utcWeekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

let plan: SeededPlan;

async function seedDraft(page: import("@playwright/test").Page, opts?: Parameters<typeof seedPlanState>[1]) {
  plan = await seedPlanState("DRAFT", opts);
  await page.goto("/plan");
  await expect(reviewHero(page)).toBeVisible();
}

test.afterAll(async () => {
  await resetTestHousehold();
});

test("M1 - inline chip: in-place working state then highlighted new content, no sheet", async ({
  page,
}) => {
  await seedDraft(page);
  const date = plan.slots[2].date;
  const card = mealCard(page, date);

  await cardChip(page, date, "Make it spicier").click();

  // Working in place on the card; no sheet opened.
  await expect(card.getByText(/^Reworking /)).toBeVisible();
  await expect(sheetContent(page)).toBeHidden();

  // New content lands with the highlight ring (ring clears after ~1.6s).
  await expect(card.getByText(REWORKED)).toBeVisible();
  await expect(card).toHaveClass(/animate-highlight-ring/, { timeout: 1_500 });
});

test("M2 - sheet action: sheet stays open pending, then closes onto the changed card", async ({
  page,
}) => {
  await seedDraft(page);
  const date = plan.slots[2].date;
  await openCardSheet(page, date);
  await expect(sheetContent(page)).toBeVisible();

  const action = sheetContent(page).getByRole("button", {
    name: "Make it spicier",
    exact: true,
  });
  await action.click();

  // Sheet STAYS open, shows pending, actions disabled.
  await expect(sheetContent(page).getByText(/^Reworking /)).toBeVisible();
  await expect(action).toBeDisabled();

  // On success the sheet closes onto the changed (now-highlighted) card.
  await expect(sheetContent(page)).toBeHidden({ timeout: 5_000 });
  await expect(mealCard(page, date).getByText(REWORKED)).toBeVisible();
});

test("M3 - meal-scoped chat changes ONLY that day (scope anchor)", async ({
  page,
}) => {
  await seedDraft(page);
  const date = plan.slots[2].date;
  await openCardSheet(page, date);
  await sheetContent(page)
    .getByRole("button", { name: /Something else\? Tell your chef/ })
    .click();

  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make it spicy");
  await page.getByRole("button", { name: "Send to chef" }).click();

  // Only the targeted day changes.
  await expect(mealCard(page, date).getByText(REWORKED)).toBeVisible({
    timeout: 6_000,
  });
  await expect(page.getByText(REWORKED)).toHaveCount(1);
});

test("M4 - whole-week chat → ack pill that scrolls to the first changed day", async ({
  page,
}) => {
  await seedDraft(page);
  await page.getByRole("button", { name: "Talk to the Chef" }).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make this week lighter");
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(ackPill(page)).toBeVisible({ timeout: 6_000 });
  await expect(ackPill(page)).toContainText("lightened up two dinners");

  // Whole-week mock reworks offsets 1 & 3; ack scrolls to the first (offset 1).
  await ackPill(page).click();
  await expect(mealCard(page, plan.slots[1].date)).toBeInViewport();
});

test("M5 - modify feedback is bottom-anchored, never a top-of-page toast", async ({
  page,
}) => {
  await seedDraft(page);
  await page.getByRole("button", { name: "Talk to the Chef" }).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill("make this week lighter");
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(ackPill(page)).toBeVisible({ timeout: 6_000 });
  const box = await ackPill(page).boundingBox();
  const vh = page.viewportSize()!.height;
  // Bottom-anchored pill, not a top toast the scrolled-down user can't see.
  expect(box!.y).toBeGreaterThan(vh / 2);
});

test("M6 - a second modify is blocked while one is in flight", async ({ page }) => {
  const SLOW_CHIP = "[E2E:SLOW=3000] slow one";
  await seedDraft(page, { chipOverrides: { 1: [SLOW_CHIP] } });

  await cardChip(page, plan.slots[1].date, SLOW_CHIP).click();
  await expect(mealCard(page, plan.slots[1].date).getByText(/^Reworking /)).toBeVisible();

  // Second modify on another card is a no-op (single active modify).
  await cardChip(page, plan.slots[2].date, "Make it spicier").click();
  await expect(
    mealCard(page, plan.slots[2].date).getByText(/^Reworking /)
  ).toHaveCount(0);
  await expect(page.getByText(/^Reworking /)).toHaveCount(1);
});

test("M7 - eating out clears that day to a de-emphasized 'Eating out' card", async ({
  page,
}) => {
  await seedDraft(page);
  const target = plan.slots[2];
  const dayName = utcWeekday(target.date);

  await page.getByRole("button", { name: "Talk to the Chef" }).click();
  await page
    .getByPlaceholder("Tell me what you're thinking this week…")
    .fill(`we're eating out ${dayName.toLowerCase()}`);
  await page.getByRole("button", { name: "Send to chef" }).click();

  await expect(mealCard(page, target.date).getByText("Eating out")).toBeVisible({
    timeout: 6_000,
  });
});
