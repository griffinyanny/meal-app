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
