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

// The order the aisles are actually stored in, read off the rendered sections.
// The rail renders `aisleOrder` verbatim, so after a reload this IS the persisted
// column — which is the thing GR7 is about. Reading the whole array rather than
// `.first()` means a drag that moved the wrong section can't pass by moving SOME
// section off the top.
async function aisleOrder(page: Page): Promise<string[]> {
  return section(page).evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-category") ?? "")
  );
}

test("GR7 - dragging a section reorders the aisles and persists", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  // Seeded order: produce, meat, dairy.
  await expect(section(page).first()).toHaveAttribute("data-category", "produce");
  const before = await aisleOrder(page);

  const produceHandle = page
    .locator('[data-category="produce"]')
    .getByRole("button", { name: /Drag .* section/ });
  // Wait for the persist call to complete before reloading — otherwise the reload
  // can abort the in-flight mutation and we'd assert against unsaved state.
  const persisted = page.waitForResponse(
    (r) => r.url().includes("reorderSections") && r.request().method() === "POST"
  );
  await dragSection(page, produceHandle, page.locator('[data-category="dairy"]'));

  // Produce moved down the list; another aisle is now first.
  await expect(section(page).first()).not.toHaveAttribute("data-category", "produce");
  const after = await aisleOrder(page);

  await persisted;
  await page.reload();
  await expect(list(page)).toBeVisible();

  // The whole order survived the round trip — not just whichever section landed
  // on top. `before` is asserted against so a no-op drag that somehow satisfied
  // the line above still fails here.
  expect(after).not.toEqual(before);
  expect(await aisleOrder(page)).toEqual(after);
});

test("GR8 - a staple chip adds its item, then drops out of the row", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  const staples = page.getByTestId("staples-row");
  await expect(staples).toBeVisible();
  // Off-list staples (olive oil, eggs) show; the on-list staple (garlic) is hidden.
  await expect(staples.getByTestId("staple-chip")).toHaveCount(2);
  await expect(staples.getByRole("button", { name: /^garlic$/i })).toHaveCount(0);

  const added = page.waitForResponse(
    (r) => r.url().includes("addItem") && r.request().method() === "POST"
  );
  await staples.getByRole("button", { name: /olive oil/i }).click();

  // The item lands on the list and the chip drops out of the row.
  await expect(rowByName(page, /olive oil/i)).toBeVisible();
  await expect(staples.getByRole("button", { name: /olive oil/i })).toHaveCount(0);
  await added;
});

test("GR9 - Talk to the Chef adds items for a meal", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  await page.getByTestId("grocery-open-chef").click();
  await page.getByRole("button", { name: "Add stuff for taco night" }).click();

  const done = page.waitForResponse(
    (r) => r.url().includes("grocery.talk") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Send to chef" }).click();
  await done;

  // The chef's reply shows in the sheet; the items land on the list after refetch.
  // (Match the reply text specifically — the pill/textarea both say "taco night".)
  await expect(page.getByText(/added tortillas/i)).toBeVisible();
  await expect(rowByName(page, /tortillas/i)).toBeVisible();
});

test("GR10 - Talk to the Chef answers a question without changing the list", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();
  await expect(page.getByTestId("grocery-row")).toHaveCount(4);

  await page.getByTestId("grocery-open-chef").click();
  await page.getByRole("button", { name: "What am I out of?" }).click();

  const done = page.waitForResponse(
    (r) => r.url().includes("grocery.talk") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Send to chef" }).click();
  await done;

  await expect(page.getByText(/low on eggs and milk/i)).toBeVisible();
  await expect(page.getByTestId("grocery-row")).toHaveCount(4); // nothing added
});

test("GR11 - Talk to the Chef removes an item by resolving its list number", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();
  await expect(rowByName(page, "Garlic")).toBeVisible();

  await page.getByTestId("grocery-open-chef").click();
  await page.getByPlaceholder(/what you're out of/i).fill("remove the garlic");

  const done = page.waitForResponse(
    (r) => r.url().includes("grocery.talk") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Send to chef" }).click();
  await done;

  // Garlic is gone — the model's [N] ref resolved to the real row (ID-safety path).
  await expect(rowByName(page, "Garlic")).toHaveCount(0);
});

// GR-L1 / GR-L2: the BUG-004 latency architecture (Phase D). The confirm-time list
// reads a per-recipe normalize cache written during plan review, so a fully-reviewed
// week makes ZERO AI calls at confirm and renders fast; a week confirmed with
// stragglers shows an honest "Finishing N recipes…" hint that names the remaining
// count. (Zero-AI-when-cached is asserted at the unit layer in grocery-generate.test;
// these cover the user-visible render + copy.)

test("GR-L1 - a fully-cached plan confirms straight to the merged list, no normalize hang", async ({
  page,
}) => {
  await seedGroceryState("GROCERY_PENDING_CACHED");
  await page.goto("/groceries");

  // Auto-fires generate on the pending list. Every recipe is pre-hydrated and
  // carries its review-time cache, so confirm skips the AI normalize and lands on
  // the merged list. A generous timeout still proves the point (no 37s batch).
  await expect(list(page)).toBeVisible({ timeout: 15_000 });

  // The two recipes share garlic → one merged row, plus the two single-source
  // items. Proves the cached path aggregates correctly.
  await expect(rowByName(page, /garlic/i)).toHaveCount(1);
  await expect(rowByName(page, /salmon/i)).toBeVisible();
  await expect(rowByName(page, /pasta/i)).toBeVisible();
  const garlicRow = rowByName(page, /garlic/i);
  // The merge marker carries the COUNT as its type (1F/B5). Asserting the string
  // rather than the element's presence is the point: the old amber dot was
  // visible whenever `sources.length > 1` was truthy at all, so it could not
  // fail on a wrong count. "2 dinners" can.
  await expect(garlicRow.getByTestId("grocery-merge-marker")).toHaveText("2 dinners");
});

test("GR-L2 - a plan confirmed with stragglers shows the honest 'Finishing N recipes…' hint", async ({
  page,
}) => {
  await seedGroceryState("GROCERY_HYDRATING_STRAGGLERS");
  await page.goto("/groceries");

  // The list is mid-generation (hydrating) with two unready recipes in its plan.
  // The straggler hint names the exact remaining count, not a generic shimmer.
  await expect(page.getByTestId("grocery-generating")).toHaveText("Finishing 2 recipes…");
  await expect(list(page)).toBeHidden();
});

// GR12–GR13 · BUG-054. The tab's only <h1> lived in `grocery-list-header.tsx`,
// which renders on the READY path alone — so generating, error and no-list were
// a floating card on an unlabelled document with no <h1> anywhere in it.
// BUG-028's exact defect on a different tab.
//
// ⚠️ Asserted by ROLE, never by text. `getByText("Your list")` passes happily
// against a <p>, and the whole fix IS the heading level — S54's rule, and the
// same reason SH3 had to use getByRole.
const heading = (page: Page) => page.getByRole("heading", { level: 1 });

for (const state of ["GROCERY_GENERATING", "GROCERY_ERROR"] as const) {
  test(`GR12 - ${state} still renders the page's <h1>`, async ({ page }) => {
    await seedGroceryState(state);
    await page.goto("/groceries");

    await expect(heading(page)).toHaveText("Your list");
    await expect(list(page)).toBeHidden();

    // ⚠️ The title block ONLY. The count, progress bar, organize toggle and
    // Copy stay behind — law 05 would otherwise put controls on screen that do
    // nothing, which is why the fix is not "render the whole header".
    await expect(page.getByTestId("grocery-progress-count")).toBeHidden();
    await expect(page.getByTestId("grocery-progress-bar")).toBeHidden();
  });
}

test("GR13 - the ready list has exactly ONE h1, not two", async ({ page }) => {
  // The failure mode of the fix itself: the page client renders the title for
  // non-ready states and the header renders its own on the ready path. Get the
  // condition wrong and both appear, which no unit test can see.
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();

  await expect(heading(page)).toHaveCount(1);
  await expect(heading(page)).toHaveText("Your list");
  // And the ready path keeps everything that belongs to it.
  await expect(page.getByTestId("grocery-progress-count")).toBeVisible();
});

// Stepped pointer drag (dnd-kit PointerSensor tracks pointer events; Playwright's
// touchscreen API is tap-only). Exceeds the 8px activation distance, then walks to
// the target in small steps so collision detection registers the move.
/**
 * Drag one aisle section past another. THE FIX FOR BUG-019 (three recurrences).
 *
 * The old helper pressed down, crossed the 8px activation distance, and then
 * fired ~24 more `mousemove`s back to back without ever waiting. dnd-kit runs
 * collision detection against a droppable-rect snapshot taken when the drag
 * STARTS — so if React hadn't committed the drag-start render and measured the
 * droppables before those moves landed, every move resolved against nothing,
 * `onDragEnd` got `over: null`, and `onSectionDragEnd`'s first line returned
 * early. No mutation, no error, no request: a silent no-op that looks exactly
 * like a broken feature. Whether it lost the race depended on machine load,
 * which is why it only ever failed in a full sequential run and always passed in
 * isolation.
 *
 * So this waits for the lift instead of assuming it, and then moves in steps
 * that each yield a frame, so collision detection actually runs on the way.
 */
async function dragSection(page: Page, handle: Locator, target: Locator): Promise<void> {
  // Both boxes have to be on screen: `boundingBox()` happily returns viewport
  // coordinates that are off the bottom, and the mouse cannot go there.
  await target.scrollIntoViewIfNeeded();
  await handle.scrollIntoViewIfNeeded();

  const s = await handle.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("drag: bounding box not found");
  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const tx = t.x + t.width / 2;
  // Past the target's midpoint, which is what `closestCenter` compares against.
  const ty = t.y + t.height * 0.75;

  const dragging = page.locator("[data-dragging='true']");

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx, sy + 12); // clears the 8px activation constraint

  // THE WAIT THAT WAS MISSING. Until the section reports itself as dragging,
  // dnd-kit has not measured anything and every move is thrown away.
  await expect(dragging).toHaveCount(1);

  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps);
    // One animation frame between moves. dnd-kit recomputes `over` on a rAF, so
    // a burst of moves inside a single frame collapses into one collision test.
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }

  await page.mouse.up();
  // The drop is committed once nothing is lifted any more. Releasing the mouse
  // is not the same instant as React unwinding the drag state.
  await expect(dragging).toHaveCount(0);
}
