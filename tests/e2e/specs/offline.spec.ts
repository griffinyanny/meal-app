// OF1–OF4: the PWA's offline half (Phase 1F Workstream C, docs/test-plan.md).
//
// ⚠️ THIS IS THE ONLY LAYER THAT CAN ANSWER THE QUESTION. The unit guards in
// `src/lib/offline/` scrape source and assert that the right rules are present;
// they cannot tell you whether an offline reload actually paints a grocery list.
// That takes a real service worker, a real IndexedDB and a real browser with the
// network cut, which is what these specs are.
//
// They also cover the two mechanisms that DO NOT OVERLAP, and the reason the
// obvious build fails: a service worker caches the app SHELL (GET navigations),
// and it structurally cannot cache the DATA — tRPC batches over POST and the
// Cache API rejects `Cache.put` on non-GET. Ship only the worker and OF2 is what
// breaks: the app opens instantly and shows an empty list, failing in exactly
// the moment the feature exists for.
import { test, expect, type Page } from "@playwright/test";
import { seedGroceryState, resetTestHousehold } from "../app/seed";

const list = (page: Page) => page.getByTestId("grocery-list");
const rowByName = (page: Page, name: string | RegExp) =>
  page.getByTestId("grocery-row").filter({ hasText: name });

/** Waits until a service worker is actually CONTROLLING the page. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 20_000 }
  );
}

/**
 * Waits until React Query has flushed the cache to IndexedDB.
 *
 * ⚠️ Persistence is THROTTLED (1s by default), so "the list is on screen" and
 * "the list would survive a cold launch" are different moments. Asserting on
 * the first and calling it the second is how this spec would pass against a
 * build with no persistence at all.
 */
async function waitForPersistedCache(page: Page): Promise<void> {
  await page.waitForFunction(
    async () => {
      const db = await new Promise<IDBDatabase | null>((resolve) => {
        const req = indexedDB.open("keyval-store");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (!db) return false;
      if (!db.objectStoreNames.contains("keyval")) return false;
      return await new Promise<boolean>((resolve) => {
        const req = db.transaction("keyval", "readonly").objectStore("keyval").get("meal-app-query-cache");
        req.onsuccess = () => resolve(typeof req.result === "string" && req.result.includes("grocery"));
        req.onerror = () => resolve(false);
      });
    },
    undefined,
    { timeout: 20_000 }
  );
}

test.afterAll(async () => {
  await resetTestHousehold();
});

test("OF1 - the app shell survives an offline reload", async ({ page, context }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(list(page)).toBeVisible();
  await waitForServiceWorker(page);
  await waitForPersistedCache(page);

  await context.setOffline(true);
  await page.reload();

  // The shell paints from the worker's cache rather than the browser's offline
  // error page — which, in an installed PWA with no address bar, is a dead end.
  await expect(page.getByRole("navigation")).toBeVisible({ timeout: 20_000 });

  await context.setOffline(false);
});

test("OF2 - the grocery list itself survives, not just the shell", async ({ page, context }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();
  await waitForServiceWorker(page);
  await waitForPersistedCache(page);

  await context.setOffline(true);
  await page.reload();

  // ⚠️ THE ASSERTION THAT MAKES THIS WORTH RUNNING. A service-worker-only build
  // passes OF1 and fails here: the shell is cached, the POST that fetches the
  // list is not, and the user gets a beautifully instant EMPTY list while
  // standing in a shop. This can only go green if the data half exists.
  await expect(rowByName(page, "Garlic")).toBeVisible({ timeout: 20_000 });
  await expect(rowByName(page, "Butter")).toBeVisible();

  await context.setOffline(false);
});

test("OF3 - a tick taken offline HOLDS instead of rolling back", async ({ page, context }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await rowByName(page, "Garlic").getByRole("checkbox").click();

  // React Query PAUSES the mutation rather than failing it, so `onError` never
  // fires and the optimistic tick stays. Griffin rejected the alternative by
  // name: a tick that fires and silently reverts is not less feature, it is an
  // app that looks broken.
  await expect(page.getByTestId("grocery-gotit-zone").getByText("Garlic")).toBeVisible();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");

  // Hold it long enough that a roll-back would have happened by now.
  await page.waitForTimeout(1_500);
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");

  await context.setOffline(false);
});

/** The four characters that are the entire offline announcement (1F/C, 1h). */
const clause = (page: Page) => page.getByTestId("grocery-offline-clause");

test("OF5 - offline is announced ONCE, as a clause on the count, and nowhere else", async ({
  page,
  context,
}) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();

  await expect(clause(page)).toBeHidden();

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));

  await expect(clause(page)).toHaveText("· offline");
  // The count itself is untouched — the clause is a sibling, so the number
  // stays a number.
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("0 / 4");

  // ⚠️ THE HALF THAT IS ACTUALLY THE ARTIFACT. The design is as much about what
  // does NOT appear: no banner, no strip, no per-row badge, no second sentence.
  // Asserting only that the clause is present would pass just as happily
  // against a build that also grew a banner above the list, which is the exact
  // thing the round cut.
  await expect(page.getByTestId("grocery-row")).toHaveCount(4);
  for (const row of await page.getByTestId("grocery-row").all()) {
    await expect(row).not.toContainText(/offline|queued|pending|waiting/i);
  }
  const bodyText = await page.getByTestId("grocery-list").innerText();
  expect(
    bodyText.match(/offline/gi) ?? [],
    "offline is said in exactly one place on this screen"
  ).toHaveLength(1);

  // No fill and no border, so law 05 never applies and there is nothing to tap.
  const box = await clause(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, border: s.borderTopWidth, color: s.color };
  });
  expect(box.bg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(box.border).toBe("0px");
  // The caption rung, one step quieter than the count it hangs off.
  expect(box.color).toBe("rgb(138, 124, 108)");

  await context.setOffline(false);
});

test("OF6 - the tick is pixel-identical offline, and the chef is the only thing that changes", async ({
  page,
  context,
}) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();

  /**
   * The resting checkbox on a row that has not been ticked yet, PLUS the row it
   * sits in.
   *
   * ⚠️ The row half is not padding — it is the half that catches the defect.
   * This spec first shipped measuring the checkbox alone, and a deliberately
   * planted per-row `offline` badge sailed straight past it: a sibling element
   * changes nothing about the control's own computed style. OF5 caught that one
   * and OF6, the spec whose entire subject is "no per-row anything", did not.
   * *Ask what the layer cannot see* — including a layer written this session.
   */
  const restingTick = async (name: string) => {
    const row = rowByName(page, name);
    const mark = await row.getByRole("checkbox").evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderColor, s.borderRadius, s.width, s.height].join(" ");
    });
    const shape = await row.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [el.textContent, Math.round(r.width), Math.round(r.height)].join(" ");
    });
    return `${mark} | ${shape}`;
  };

  /**
   * A ticked item's mark, read in the GOT IT zone.
   *
   * ⚠️ Ticking moves the item OUT of the list and into that zone, so "measure
   * the same row before and after" is not a thing this screen can do — the
   * comparison has to be one ticked item against another.
   */
  const gotItMark = (name: string) =>
    page
      .getByTestId("grocery-gotit-zone")
      .getByRole("button", { name: `Uncheck ${name.toLowerCase()}` })
      .locator("span")
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.borderRadius, s.width, s.height].join(" ");
      });

  const chefStyle = () =>
    page.getByTestId("grocery-open-chef").evaluate((el) => getComputedStyle(el).backgroundColor);

  // An ordinary, fully-online tick, kept as the reference.
  await rowByName(page, "Garlic").getByRole("checkbox").click();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");
  const sentMark = await gotItMark("Garlic");
  const restingOnline = await restingTick("Lemon");
  const chefOnline = await chefStyle();

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(clause(page)).toHaveText("· offline");

  // ⚠️ THE ARTIFACT'S SHARPEST LINE, and it is an assertion of SAMENESS — the
  // kind of thing no screenshot review reliably catches, because nothing looks
  // wrong. "The queue is a fact about the app, not about the onion": no dashed
  // box, no clock badge, no per-row anything. Measured rather than
  // class-matched, so a build that dimmed the tick behind a class the DOM still
  // calls the same would not slip through.
  expect(await restingTick("Lemon"), "an unticked row must not change offline").toBe(
    restingOnline
  );

  // The one thing that DOES change: the chef is a live model call, so it goes
  // provisional — keeping its ORDINARY label, because the header already said
  // why and a second voice saying it again is the strip the round cut.
  expect(await chefStyle(), "the chef launcher must go provisional").not.toBe(chefOnline);
  await expect(page.getByTestId("grocery-open-chef")).toBeDisabled();
  await expect(page.getByTestId("grocery-open-chef")).toHaveAttribute(
    "aria-label",
    "Talk to the chef"
  );

  // And a HELD tick is indistinguishable from the sent one taken a moment ago.
  await rowByName(page, "Lemon").getByRole("checkbox").click();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("2 / 4");
  expect(await gotItMark("Lemon"), "a held tick must look exactly like a sent one").toBe(
    sentMark
  );

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(clause(page)).toBeHidden({ timeout: 15_000 });

  // Flushing changes nothing about it either — the resolution is an absence.
  expect(await gotItMark("Lemon"), "flushing must not restyle the tick").toBe(sentMark);
});

test("OF7 - flushing says `· sending` once, then resolves into an absence", async ({
  page,
  context,
}) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();

  // ⚠️ The flush is SLOWED BY CONSTRUCTION rather than hoped to be slow. On a
  // local server a resumed mutation can land inside one React batch, so the
  // word would never be set and this spec would fail for a reason that is not
  // the bug — S57's "fix a race by construction, not by lengthening a wait".
  // The delay is the input, not a tolerance.
  await page.route(
    (url) => url.href.includes("checkItem"),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await route.continue();
    }
  );

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await rowByName(page, "Garlic").getByRole("checkbox").click();
  await expect(clause(page)).toHaveText("· offline");

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  // One crossfade to a different word. Never a loop — only the chef loops.
  await expect(clause(page)).toHaveText("· sending", { timeout: 15_000 });

  // ⚠️ THE THIRD FRAME IS THE WHOLE POINT: the resolution is an ABSENCE.
  // Nothing confirms, nothing lands, nothing needs dismissing. A build that
  // replaced the word with a "Synced" pill would satisfy every other assertion
  // in this file and be the opposite of the artifact.
  await expect(clause(page)).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");
  await expect(page.getByTestId("grocery-list")).not.toContainText(/synced|saved|sent|up to date/i);
});

test("OF4 - the queued tick flushes to the server on reconnect", async ({ page, context }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(rowByName(page, "Garlic")).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await rowByName(page, "Garlic").getByRole("checkbox").click();
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");

  // Reconnect and watch the paused mutation actually reach the server. Asserting
  // on the REQUEST rather than on the UI is deliberate: the UI already showed
  // the tick optimistically, so a UI assertion here would pass against a build
  // that never sent anything.
  const flushed = page.waitForResponse(
    (r) => r.url().includes("checkItem") && r.request().method() === "POST",
    { timeout: 30_000 }
  );
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await flushed;

  // And it is genuinely persisted: a fresh load from the server still has it.
  await page.goto("/groceries");
  await expect(page.getByTestId("grocery-progress-count")).toHaveText("1 / 4");
});
