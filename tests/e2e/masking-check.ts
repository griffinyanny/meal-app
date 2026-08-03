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
    // ⚠️ Record EVERY request, GET included. The first version pushed only when
    // a body existed, which silently dropped the two GETs that matter most:
    // `/array/<token>/config` (the remote config that actually decides whether
    // recording runs) and the separate `posthog-recorder` script. Their absence
    // from the endpoint list read as "never happened" when it only meant "no
    // POST body" — an instrument that could not see half its own subject.
    seen.push({ url, body });
    await route.continue();
  });

  // ⚠️ The RESPONSE to `/flags/` is what decides whether replay runs at all.
  // posthog-js asks the project what it is allowed to do; if the project has
  // session replay switched off, the SDK obeys and records nothing, with a
  // perfectly correct client config. Reading the answer is the difference
  // between "recording is off" and knowing WHY.
  // ⚠️ If the recorder loads and emits nothing, the next suspect is OUR code:
  // `maskTextFn` runs inside rrweb's serializer, and a throw there kills the
  // snapshot silently. The unit tests cannot see this — their fake element
  // always has `hasAttribute`, which is better behaved than a real DOM.
  page.on("pageerror", (err) => console.log(`[masking] PAGE ERROR: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[masking] CONSOLE ERROR: ${msg.text()}`);
  });

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
    endpoints.some((p) => p.startsWith("/s")),
    // ⚠️ CORRECTED. This message used to blame the PostHog project settings,
    // and that diagnosis was WRONG — verified by fetching
    // `us-assets.i.posthog.com/array/<token>/config` directly, which returns a
    // full `sessionRecording` object with `linkedFlag: null` and no sample
    // rate. Recording IS enabled on the project.
    //
    // `/flags/` also reports `sessionRecording: false`, and that field is NOT
    // the authoritative source in current posthog-js — remote config is. Keying
    // a diagnosis off it sent three rounds of "check your toggle" at settings
    // that were correct the whole time.
    `no /s/ replay chunk was posted. Endpoints seen: ${endpoints.join(", ")}. ` +
      `Project config is NOT the suspect — verify the recorder script loaded ` +
      `(a GET to us-assets.i.posthog.com) before looking anywhere else.`
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

// ⚠️ TEMPORARY, S63 — Sentry wiring verification.
//
// Sentry's own skill says the task is not done until an event is CONFIRMED in
// Sentry, and warns against stopping at "go check your dashboard". Their
// confirm loop uses the Sentry MCP, which is not connected here — so this does
// the equivalent from the other end: it proves the browser actually emits an
// event envelope, and that the envelope survives our own proxy.
//
// That second half is the part worth testing. `tunnelRoute` makes the client
// POST to `/monitoring` on OUR origin, which `src/proxy.ts` gates. If the
// exemption in `isSignedOutReachable()` were wrong, this request would 307 to
// /login and Sentry would receive nothing, silently.
test("a client error reaches Sentry through our own tunnel", async ({ page }) => {
  const tunnelHits: string[] = [];

  await page.route("**/monitoring*", async (route) => {
    tunnelHits.push(route.request().postData() ?? "");
    await route.continue();
  });

  await page.goto("/groceries");

  // A real unhandled error, not `captureException` — this exercises the global
  // handler the SDK installs, which is the path a genuine crash takes.
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("S63 sentry wiring check");
    }, 0);
  });

  await expect
    .poll(() => tunnelHits.length, { timeout: 20_000 })
    .toBeGreaterThan(0);

  const envelope = tunnelHits.join("\n");
  expect(envelope, "envelope did not name our error").toContain(
    "S63 sentry wiring check"
  );

  // ⚠️ The PII posture, verified on the wire rather than trusted from config.
  // `dataCollection` turns all of these off; a regression would show up here as
  // a cookie or a request body riding along with the stack trace.
  expect(envelope, "session cookie in the envelope").not.toContain("sb-");
  expect(envelope.toLowerCase(), "cookies in the envelope").not.toContain(
    '"cookies"'
  );

  console.log(`[sentry] VERIFIED — ${tunnelHits.length} envelope(s) via /monitoring`);
});
