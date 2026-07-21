// GR1–GR7: the Groceries shoppable list (Phase 1D Slice C, docs/test-plan.md).
// Generation states (generating / error / pending→ready), one-zone check-off with
// persistence, quick-add + dedupe, organize-mode + section-reorder persistence.
// Grocery items are seeded directly (deterministic mechanics); quick-add's tidy
// runs through the real ingredient-normalize AI mock.
import { test, expect, type Page, type Locator } from "@playwright/test";
import { seedGroceryState, resetTestHousehold } from "../app/seed";

const list = (page: Page) => page.getByTestId("grocery-list");
const rowByName = (page: Page, name: string | RegExp) =>
  page.getByTestId("grocery-row").filter({ hasText: name });
const gotItZone = (page: Page) => page.getByTestId("grocery-gotit-zone");
const section = (page: Page) => page.getByTestId("grocery-section");

test.afterAll(async () => {
  await resetTestHousehold();
});

test("GR1 - a mid-generation list shows the phase-named generating state", async ({ page }) => {
  await seedGroceryState("GROCERY_GENERATING");
  await page.goto("/groceries");

  await expect(page.getByTestId("grocery-generating")).toHaveText("Sorting your ingredients…");
  await expect(list(page)).toBeHidden();
});

test("GR2 - a failed generation shows the error card with a retry", async ({ page }) => {
  await seedGroceryState("GROCERY_ERROR");
  await page.goto("/groceries");

  await expect(page.getByText("The chef got stuck building your list.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("GR3 - a pending list auto-generates and lands on the ready list", async ({ page }) => {
  await seedGroceryState("GROCERY_PENDING");
  await page.goto("/groceries");

  // Fires generate once, polls, and resolves to the (empty) ready list + add row.
  await expect(list(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("grocery-add-top")).toBeVisible();
});

test("GR4 - checking an item drops it into the one GOT IT zone and persists", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  // Garlic starts in the Produce section, not the GOT IT zone.
  await expect(rowByName(page, "Garlic")).toBeVisible();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("0 / 4");

  const checked = page.waitForResponse(
    (r) => r.url().includes("checkItem") && r.request().method() === "POST"
  );
  await rowByName(page, "Garlic").getByRole("checkbox").click();

  // It leaves the list and appears in the single GOT IT zone; progress advances.
  await expect(gotItZone(page).getByText("Garlic")).toBeVisible();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");

  await checked;
  await page.reload();
  await expect(gotItZone(page).getByText("Garlic")).toBeVisible();
});

test("GR5 - quick-add inserts an item; a duplicate shows the dedupe pill", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  const topAdd = page.getByTestId("grocery-add-top");
  await topAdd.fill("Tomatoes");
  await topAdd.press("Enter");
  await expect(rowByName(page, /tomato/i)).toBeVisible();

  // Adding something already on the list is refused with the dedupe notice.
  await topAdd.fill("garlic");
  await topAdd.press("Enter");
  await expect(page.getByTestId("grocery-dedupe")).toBeVisible();
  await expect(rowByName(page, "Garlic")).toHaveCount(1);
});

test("GR6 - the organize mode toggle persists across a reload", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  // Grouped by default → aisle sections present.
  await expect(section(page).first()).toBeVisible();

  const saved = page.waitForResponse(
    (r) => r.url().includes("setOrganizeMode") && r.request().method() === "POST"
  );
  await page.getByRole("tab", { name: "Ungrouped" }).click();
  await expect(section(page)).toHaveCount(0); // flat notepad list, no sections

  await saved;
  await page.reload();
  await expect(list(page)).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Ungrouped" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("GR7 - dragging a section reorders the aisles and persists", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  // Seeded order: produce, meat, dairy.
  await expect(section(page).first()).toHaveAttribute("data-category", "produce");

  const produceHandle = page
    .locator('[data-category="produce"]')
    .getByRole("button", { name: /Drag .* section/ });
  // Wait for the persist call to complete before reloading — otherwise the reload
  // can abort the in-flight mutation and we'd assert against unsaved state.
  const persisted = page.waitForResponse(
    (r) => r.url().includes("reorderSections") && r.request().method() === "POST"
  );
  await dragElement(page, produceHandle, page.locator('[data-category="dairy"]'));

  // Produce moved down the list; another aisle is now first.
  await expect(section(page).first()).not.toHaveAttribute("data-category", "produce");
  const firstCat = await section(page).first().getAttribute("data-category");

  await persisted;
  await page.reload();
  await expect(list(page)).toBeVisible();
  await expect(section(page).first()).toHaveAttribute("data-category", firstCat!);
});

// Stepped pointer drag (dnd-kit PointerSensor tracks pointer events; Playwright's
// touchscreen API is tap-only). Exceeds the 8px activation distance, then walks to
// the target in small steps so collision detection registers the move.
async function dragElement(page: Page, source: Locator, target: Locator): Promise<void> {
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("drag: bounding box not found");
  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const tx = t.x + t.width / 2;
  const ty = t.y + t.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx, sy + 14, { steps: 3 }); // pass activation threshold
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps, {
      steps: 2,
    });
  }
  await page.mouse.move(tx, ty + 24, { steps: 3 });
  await page.mouse.up();
}
