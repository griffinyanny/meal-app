// Page-object-lite: the reused Plan-tab locators + a few interaction helpers,
// so specs read intent-first and selector churn lands in one place.
import { type Page, type Locator } from "@playwright/test";

export function mealCard(page: Page, date: string): Locator {
  return page.locator(`[data-meal-date="${date}"]`);
}

// The whole-card tap target (a11y-labelled "Open {day}'s …"). Opens the sheet.
export async function openCardSheet(page: Page, date: string): Promise<void> {
  await mealCard(page, date)
    .getByRole("button", { name: /^Open / })
    .click();
}

export function cardChip(page: Page, date: string, chip: string): Locator {
  return mealCard(page, date).getByRole("button", { name: chip, exact: true });
}

export function sheetContent(page: Page): Locator {
  return page.locator('[data-slot="drawer-content"]');
}

export function sheetTitle(page: Page): Locator {
  return page.locator('[data-slot="drawer-title"]');
}

export function drawerScrim(page: Page): Locator {
  return page.locator('[data-slot="drawer-scrim"]');
}

export function closeButton(page: Page): Locator {
  return page.getByRole("button", { name: "Close" });
}

export function ackPill(page: Page): Locator {
  return page.getByTestId("modify-ack-pill");
}

export function errorPill(page: Page): Locator {
  return page.getByTestId("modify-error-pill");
}

export function reviewHero(page: Page): Locator {
  return page.getByRole("heading", { name: "Your week, ready to review" });
}

export function intentHeading(page: Page): Locator {
  return page.getByRole("heading", { name: "What are you thinking this week?" });
}

// Drag the bottom sheet down by its handle using a stepped pointer drag (vaul
// tracks pointer events; Playwright's touchscreen API is tap-only).
export async function dragSheetDown(page: Page, distance = 400): Promise<void> {
  const handle = page.getByTestId("drawer-handle");
  const box = await handle.boundingBox();
  if (!box) throw new Error("drawer handle not found for drag");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let dy = 0; dy <= distance; dy += 40) {
    await page.mouse.move(cx, cy + dy, { steps: 2 });
  }
  await page.mouse.up();
}
