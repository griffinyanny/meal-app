// Y1–Y9: the You tab (Phase 1E) — first You coverage. Audit-surface render, direct
// hard-constraint edits with undo, the memory ledger (remove + implicit dismiss +
// expand), AI capture through the real user.talk pipeline (against the
// preferences-talk AI mock), and the new-user "still learning" state. Preferences
// and memories are seeded directly (deterministic); the Talk-to-Chef test drives
// the whole capture pipeline end to end.
import { test, expect, type Page } from "@playwright/test";
import {
  seedYouState,
  resetTestHousehold,
  seedOnboardingState,
  readOnboardingResult,
} from "../app/seed";

const safety = (page: Page) => page.getByTestId("you-safety-card");
const soft = (page: Page) => page.getByTestId("you-soft-card");
const toast = (page: Page) => page.getByTestId("you-toast");
const memoryCard = (page: Page, text: string | RegExp) =>
  page.getByTestId("you-memory").filter({ hasText: text });

test.afterAll(async () => {
  await resetTestHousehold();
});

test("Y1 - the returning-user audit surface renders every getChefContext field", async ({
  page,
}) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  await expect(page.getByText("Here's what I know about you.")).toBeVisible();

  // Safety card: allergy-weighted + plain restriction.
  await expect(safety(page).getByText("Shellfish")).toBeVisible();
  await expect(safety(page).getByText("allergy")).toBeVisible();
  await expect(safety(page).getByText("No pork")).toBeVisible();

  // Soft card: dislikes + cuisines + the typed fields.
  await expect(soft(page).getByText("Cilantro")).toBeVisible();
  await expect(soft(page).getByText("Mediterranean")).toBeVisible();
  await expect(soft(page).getByText("2 adults")).toBeVisible();

  // Ledger + account footer.
  await expect(memoryCard(page, "Switched to pescatarian in July.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("Y2 - removing a restriction chip confirms with an undo that restores it", async ({
  page,
}) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");
  await expect(safety(page).getByText("No pork")).toBeVisible();

  await page.getByRole("button", { name: "Remove No pork" }).click();

  await expect(safety(page).getByText("No pork")).toBeHidden();
  await expect(toast(page)).toContainText("Removed");

  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(safety(page).getByText("No pork")).toBeVisible({ timeout: 10_000 });
});

test("Y3 - adding a dislike inline shows the new chip", async ({ page }) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  await soft(page).getByRole("button", { name: "Add a dislike" }).click();
  await soft(page).getByRole("textbox", { name: "Add a dislike" }).fill("mushrooms");
  await soft(page).getByRole("textbox", { name: "Add a dislike" }).press("Enter");

  await expect(soft(page).getByText("Mushrooms")).toBeVisible();
  await expect(toast(page)).toContainText("Added mushrooms");
});

test("Y4 - the household stepper edits directly and persists to the field", async ({ page }) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  await soft(page).getByText("2 adults").click();
  await page.getByRole("button", { name: "Increase People" }).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(soft(page).getByText("3 adults")).toBeVisible();
});

test("Y5 - removing a memory drops it, confirms, and undo brings it back", async ({ page }) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  const card = memoryCard(page, "Switched to pescatarian in July.");
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Remove this memory" }).click();

  await expect(memoryCard(page, "Switched to pescatarian in July.")).toBeHidden();
  await expect(toast(page)).toContainText("stop cooking around this");

  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(memoryCard(page, "Switched to pescatarian in July.")).toBeVisible({
    timeout: 10_000,
  });
});

test("Y6 - an implicit memory carries the 'I noticed' label and is dismissible", async ({
  page,
}) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  const card = memoryCard(page, "Eases off heavy cream sauces.");
  await expect(card.getByText("I noticed")).toBeVisible();

  await card.getByRole("button", { name: "Remove this memory" }).click();
  await expect(memoryCard(page, "Eases off heavy cream sauces.")).toBeHidden();
  await expect(toast(page)).toContainText("Dismissed");
});

test("Y7 - the ledger collapses to three with an expand toggle", async ({ page }) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");

  // 5 seeded memories → 3 shown, the oldest hidden behind the toggle.
  await expect(memoryCard(page, "Prefers Rao's for jarred tomato sauce.")).toBeHidden();
  await page.getByRole("button", { name: /more the chef remembers/ }).click();
  await expect(memoryCard(page, "Prefers Rao's for jarred tomato sauce.")).toBeVisible();
});

test("Y8 - Talk-to-Chef captures an allergy end to end and confirms with undo", async ({
  page,
}) => {
  await seedYouState("YOU_RETURNING");
  await page.goto("/you");
  await expect(safety(page).getByText("Gluten")).toBeHidden();

  await page.getByRole("button", { name: "Talk to the chef" }).click();
  await page.getByPlaceholder("Tell me anything…").fill("I'm allergic to gluten");
  await page.getByRole("button", { name: "Send to chef" }).click();

  // The whole pipeline runs: user.talk → preferences-talk mock → persist → refetch.
  // The gluten allergy lands on the safety card with its weighting sub-label.
  const glutenChip = safety(page).getByText("Gluten");
  await expect(glutenChip).toBeVisible({ timeout: 15_000 });
  await expect(toast(page)).toContainText("gluten");
  await expect(toast(page).getByRole("button", { name: "Undo" })).toBeVisible();
});

test("Y9 - a brand-new user sees the 'we've just met' + 'still learning' state", async ({
  page,
}) => {
  await seedYouState("YOU_NEW");
  await page.goto("/you");

  await expect(page.getByText("We've just met.")).toBeVisible();
  await expect(page.getByTestId("you-ledger-empty")).toBeVisible();
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});

test("Y10 - test mode resets the interview back to a genuine first run", async ({
  page,
}) => {
  // The control exists because the interview fires once per account. If the
  // reset ever half-works, the next run starts with answers already filled in
  // and the thing being tested is not the thing that ships.
  await seedYouState("YOU_RETURNING");
  await seedOnboardingState("ONBOARDING_DONE");
  await page.goto("/you");

  await page.getByTestId("you-reset-onboarding").click();
  await page.getByTestId("you-reset-onboarding-confirm").click();

  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByText("Let's get to know each other. Then I'll cook your week.")
  ).toBeVisible();

  const saved = await readOnboardingResult();
  expect(saved.onboardingCompletedAt).toBeNull();
  expect(saved.dietaryFramework).toBeNull();
  expect(saved.onboardingMemories).toHaveLength(0);
});

// Y10 leaves the shared test user mid-first-run, which would redirect every
// later spec to /welcome. Restoring the onboarded default is part of this
// file's contract now, exactly as it is in onboarding.spec.ts.
test.afterEach(async () => {
  await seedOnboardingState("ONBOARDING_DONE");
});
