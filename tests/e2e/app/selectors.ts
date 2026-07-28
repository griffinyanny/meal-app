// Page-object-lite: the reused Plan-tab locators + a few interaction helpers,
// so specs read intent-first and selector churn lands in one place.
//
// ── 1E.5 REBUILT THIS SURFACE (BUG-024) ───────────────────────────────────
// Days became containers and meals became inset rows, which moved every anchor
// the Plan specs used to select against:
//
//   - the "Your week, ready to review" hero is GONE. The chef header replaced
//     it and its text is now the model's own summary, so there is no stable
//     string to wait on. `planRail` is the structural anchor instead.
//   - the AI action chips LEFT THE CARD for the meal sheet (§C: a compact row
//     cannot host them at the density the rail now supports). Firing one means
//     opening the sheet first — `runMealAction` is that round trip.
//   - the in-card "Reworking …" label BECAME a gold ring on the changed row
//     plus the chef's sentence in the action bar's slot. `workingRing` and
//     `landedRing` read the ring off computed style rather than off a class
//     name, because the ledger's rule is that the ring is GOLD and a class
//     match would pass just as happily on a grey one.
import { type Page, type Locator } from "@playwright/test";

// The chef's gold, as the browser reports it. §C makes this colour load-bearing
// (gold marks the chef WORKING), so an assertion that only proved "a ring
// exists" would not be testing the rule.
//
// There are TWO golds in the spec and they are not interchangeable:
//   --spec-gold       #E9B348 — the chef's MARK: the working ring, the landed
//                               ring, the shimmer. Something is happening.
//   --spec-gold-voice #E0B463 — the chef SPEAKING: the italic rationale.
// Counting one with the other's value silently returns zero, which reads as
// "no gold on the screen" — the most misleading possible pass.
export const CHEF_GOLD = "233, 179, 72";
export const CHEF_VOICE_GOLD = "224, 180, 99";

/**
 * The rebuilt rail — present on every state that renders a week (draft,
 * confirmed, mid-week, streaming). The anchor a Plan spec waits on before it
 * touches anything.
 */
export function planRail(page: Page): Locator {
  return page.getByTestId("plan-rail");
}

/**
 * A day's meal row, by date.
 *
 * `data-meal-date` survived the rebuild but MOVED: it now sits on the row's own
 * button rather than on a card that contained one, so this locator IS the tap
 * target. A day you're out of carries it too (on the absent rail row), because
 * a modify can change that day and the acknowledgement has to be able to find it.
 */
export function mealRow(page: Page, date: string): Locator {
  return page.locator(`[data-meal-date="${date}"]`);
}

/** Open a meal's sheet. The row is the button — there is no inner tap target. */
export async function openMealSheet(page: Page, date: string): Promise<void> {
  await mealRow(page, date).click();
}

/**
 * One of the chef's actions inside the OPEN meal sheet. This is where the chips
 * live now; there is no on-card equivalent to fall back to.
 */
export function mealAction(page: Page, label: string): Locator {
  return sheetContent(page).getByRole("button", { name: label, exact: true });
}

/** Open `date`'s sheet and fire one of its actions — the whole modify entry. */
export async function runMealAction(
  page: Page,
  date: string,
  label: string
): Promise<void> {
  await openMealSheet(page, date);
  await mealAction(page, label).click();
}

/**
 * The row's live `box-shadow`. While the chef rewrites a row it carries the
 * gold working ring on its own radius (§C: the ROW is the unit of change
 * feedback, never the day container).
 */
export function rowShadow(page: Page, date: string): Promise<string> {
  return mealRow(page, date).evaluate(
    (el) => getComputedStyle(el).boxShadow
  );
}

/**
 * The row's live `animation-name`. A change landing runs the one-shot
 * `landedRing` — gold, on the row, then gone.
 */
export function rowAnimation(page: Page, date: string): Promise<string> {
  return mealRow(page, date).evaluate(
    (el) => getComputedStyle(el).animationName
  );
}

/**
 * Every date whose row is currently wearing the gold working ring.
 *
 * The rail's answer to "what is the chef touching right now". Returned as dates
 * rather than a count so a spec can assert WHICH row, not just how many — the
 * §C rule is that the ring lands on the changed row and nowhere else.
 */
export function goldRingedDates(page: Page): Promise<string[]> {
  return page.evaluate((gold) => {
    const rows = document.querySelectorAll<HTMLElement>("[data-meal-date]");
    return [...rows]
      .filter((el) => getComputedStyle(el).boxShadow.includes(gold))
      .map((el) => el.dataset.mealDate ?? "");
  }, CHEF_GOLD);
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

/**
 * The action bar's slot when the chef owns it (§C · W3).
 *
 * Replaces the S16 ack and error pills, which stacked ABOVE the confirm bar.
 * The toast does not sit above the bar — it takes the bar's exact box, so the
 * two can never be on screen together. `planToast` and `confirmBar` are
 * therefore mutually exclusive by construction, which is what the M-series
 * asserts rather than assuming.
 */
export function planToast(page: Page): Locator {
  return page.getByTestId("plan-toast");
}

export function toastAction(page: Page, label: string): Locator {
  return planToast(page).getByRole("button", { name: label });
}

/** The draft's one decision — the primary the toast displaces. */
export function confirmBar(page: Page): Locator {
  return page.getByRole("button", { name: /^Confirm \d+ / });
}

/**
 * The whole-week chef door.
 *
 * A fourth thing the rail moved, beyond BUG-024's three: the standalone "Talk
 * to the Chef" button is gone. §D puts the revise door high in the chef header
 * as chrome ("never a floating object"), where it reads as `Something's off` on
 * a week you can still argue with. Do not confuse it with the CONFIRMED week's
 * header control, which is `Plan a new week` — that one is the regenerate door.
 */
export function talkToChef(page: Page): Locator {
  return page.getByRole("button", { name: "Something's off" });
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
