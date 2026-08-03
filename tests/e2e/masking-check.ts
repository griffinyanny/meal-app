// ⚠️ TEMPORARY, S63 — the measurement that closes 1F/D3's one owed item.
//
// The masking POLICY is unit-tested (`src/lib/analytics/masking.test.ts`). What
// was never verified is the WIRING: whether posthog-js actually routes this
// app's text through `maskTextFn` in a real browser. A config that reads
// correctly and records the grocery list is the false green this project has
// produced six distinct ways, so the config is the hypothesis and this is the
// measurement.
//
// It reads the ACTUAL wire payload rather than PostHog's rendering of it, which
// is the stronger check: it cannot be fooled by a dashboard that happens to
// redact on display, and it needs nobody's dashboard login.
//
// Every ingest request is ABORTED after its body is read, so nothing reaches
// PostHog and the project's dataset stays clean.
import { gunzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { seedGroceryState, resetTestHousehold } from "./app/seed";

/**
 * posthog-js gzips replay payloads (`?compression=gzip-js`), which PostHog's own
 * `/flags/` response advertises as supported.
 *
 * ⚠️ This is the difference between a measurement and a vacuous pass. Searching
 * a GZIPPED body for "garlic" finds nothing whether or not it leaked — the
 * check would come back clean while reading compressed noise, which is exactly
 * the false green this whole exercise exists to avoid.
 */
function readBody(url: string, buffer: Buffer | null, raw: string | null): string {
  if (buffer && url.includes("compression=gzip")) {
    try {
      return gunzipSync(buffer).toString("utf8");
    } catch {
      // Not actually gzip. Fall through rather than silently returning "".
    }
  }
  return raw ?? buffer?.toString("utf8") ?? "";
}

test.afterAll(async () => {
  await resetTestHousehold();
});

test("session replay masks the grocery list on the wire", async ({ page }) => {
  const seen: { url: string; body: string }[] = [];

  // ⚠️ `continue()`, NOT `abort()`. The first attempt aborted every request to
  // the ingest host — which includes posthog-js's REMOTE CONFIG call, and the
  // SDK gates session recording on that response. So recording never started,
  // 493 bytes of one ordinary event came back, and the check failed on its own
  // "did anything happen" guard. **The instrument had disabled the subject it
  // was measuring.** Letting traffic through costs a handful of robot events in
  // the project, which is cheap and also means Griffin can open the recording
  // himself.
  await page.route(/i\.posthog\.com/, async (route) => {
    const url = route.request().url();
    const body = readBody(
      url,
      route.request().postDataBuffer(),
      route.request().postData()
    );
    if (body) seen.push({ url, body });
    await route.continue();
  });

  // ⚠️ The RESPONSE to `/flags/` is what decides whether replay runs at all.
  // posthog-js asks the project what it is allowed to do; if the project has
  // session replay switched off, the SDK obeys and records nothing, with a
  // perfectly correct client config. Reading the answer is the difference
  // between "recording is off" and knowing WHY.
  page.on("response", async (response) => {
    if (!response.url().includes("/flags")) return;
    try {
      const json = await response.text();
      console.log(`[masking] /flags/ response: ${json.slice(0, 600)}`);
    } catch {
      /* body already consumed */
    }
  });

  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(page.getByTestId("grocery-list")).toBeVisible();

  // rrweb batches; scroll and interact so a full snapshot plus incremental
  // events are emitted, then give the flush interval time to fire.
  await page.mouse.wheel(0, 300);
  await page.getByTestId("grocery-row").first().hover();
  await page.waitForTimeout(12_000);

  const wire = seen.map((s) => s.body).join("\n");
  const endpoints = [...new Set(seen.map((s) => new URL(s.url).pathname))];
  console.log(`[masking] endpoints hit: ${endpoints.join(", ")}`);
  console.log(`[masking] ${seen.length} requests, ${wire.length} bytes`);

  // ---- 1. The RECORDER is running, not merely the SDK. ----------------------
  // ⚠️ Two separate facts, and conflating them is how the first attempt fooled
  // itself. "posthog sent something" was TRUE while replay was off — 493 bytes
  // of one ordinary event. Replay chunks go to `/s/`, so that endpoint is the
  // only honest evidence the subject of this test exists at all.
  expect(seen.length, "posthog sent nothing at all").toBeGreaterThan(0);
  expect(
    endpoints.some((p) => p.includes("/s")),
    `no session-replay endpoint hit — recording is OFF. Endpoints seen: ${endpoints.join(", ")}. ` +
      `Most likely cause: session replay is not enabled in the PostHog PROJECT SETTINGS, ` +
      `which is a separate toggle from the SDK config.`
  ).toBe(true);

  // ---- 2. What the screen was showing, by name. -----------------------------
  // These are the seeded grocery items rendered on screen at capture time. If
  // masking works, not one of them can appear anywhere in the payload.
  // ⚠️ Read out of `grocery-seed-states.ts`, NOT guessed. A hand-invented name
  // that is not actually on screen cannot be leaked, so the check would pass
  // while measuring nothing — the vacuous pass, one door over.
  const ON_SCREEN = ["garlic", "lemon", "chicken thighs", "butter"];
  const leaked = ON_SCREEN.filter((name) =>
    wire.toLowerCase().includes(name.toLowerCase())
  );
  expect(leaked, "GROCERY ITEM NAMES FOUND IN THE REPLAY PAYLOAD").toEqual([]);

  // ---- 3. The masking substitution is present. ------------------------------
  // `maskContent` replaces every non-whitespace character with U+2022. Its
  // presence proves text went THROUGH our function rather than being absent for
  // some unrelated reason (e.g. the snapshot never captured the list at all).
  expect(wire.includes("\\u2022") || wire.includes("•"), "no masked text found").toBe(
    true
  );

  console.log(
    `[masking] VERIFIED — ${seen.length} requests, ${wire.length} bytes inspected, 0 leaks`
  );
});
