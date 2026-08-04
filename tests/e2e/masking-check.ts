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
// ⚠️ Ingest traffic is READ AND FORWARDED, not aborted — see the note on the
// route handler. A handful of events from this run land in the real PostHog
// project on purpose, so Griffin can open the recording himself.
import fs from "node:fs";
import path from "node:path";
import { gunzipSync, inflateSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { seedGroceryState, resetTestHousehold } from "./app/seed";
import { STORAGE_STATE_PATH } from "./app/test-context";

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
  if (buffer && buffer.length >= 2) {
    // gzip: 1f 8b. zlib/deflate: 78 01 / 78 9c / 78 da.
    const gzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
    const zlib = buffer[0] === 0x78;
    if (gzip || zlib) {
      try {
        return (gzip ? gunzipSync(buffer) : inflateSync(buffer)).toString("utf8");
      } catch {
        // Fall through rather than silently returning "" — an undecodable body
        // must reach the caller as bytes so `assertDecoded` can reject it.
      }
    }
  }
  return raw ?? buffer?.toString("utf8") ?? "";
}

/**
 * ⚠️ THE REPLAY PAYLOAD IS COMPRESSED TWICE, AND THE DOM IS ONLY IN THE INNER
 * ONE. This is the difference between measuring the recording and measuring its
 * envelope.
 *
 * After the outer gzip, the `/s/` body is ordinary JSON — and every large
 * `$snapshot_data` item carries its payload as `data: "<gzip>"`, a SECOND gzip
 * stream that posthog-js writes into the JSON as a latin1 string (each byte one
 * code point, so control bytes arrive as `\b…`). **The rendered
 * text — the grocery item names, or the bullets that should have replaced
 * them — exists only inside that inner stream.**
 *
 * ⚠️ Which means the leak check was vacuous in TWO stacked ways, not one. Even
 * after the outer gzip was fixed, searching the outer JSON for "garlic" could
 * not find it whether or not it leaked, because the outer JSON has never
 * contained a single word of page content. A check that reads an envelope and
 * reports on the letter.
 */
function expandSnapshots(body: string): { text: string; expanded: number } {
  let expanded = 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { text: body, expanded: 0 };
  }

  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      // latin1 → bytes, because that is how posthog-js wrote them.
      const buf = Buffer.from(node, "latin1");
      if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        try {
          out.push(gunzipSync(buf).toString("utf8"));
          expanded += 1;
          return;
        } catch {
          /* not a usable stream; fall through and keep the raw string */
        }
      }
      out.push(node);
      return;
    }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        out.push(k);
        walk(v);
      }
      return;
    }
    out.push(String(node));
  };
  walk(parsed);
  return { text: out.join("\n"), expanded };
}

/**
 * ⚠️ THE VACUOUS-PASS GUARD, and it caught a real one.
 *
 * The first version of `readBody` gunzipped only when the URL contained
 * `compression=gzip`. **The `/s/` request carries no query string at all** —
 * posthog-js compresses the replay payload and says so in a header, not the
 * URL — so the branch never fired, and 30,726 bytes of gzip went into the leak
 * check as text. Searching compressed bytes for "garlic" cannot find it whether
 * or not it leaked, so **the "no grocery names in the payload" assertion passed
 * while measuring nothing.** This file's own header warned about exactly that
 * and the URL heuristic walked into it anyway.
 *
 * So: prove the payload is readable BEFORE reading anything out of it. A body
 * that is mostly unprintable bytes is not evidence of anything.
 */
function assertDecoded(label: string, body: string): void {
  if (body.length === 0) return; // GETs legitimately have none.
  const unprintable = (body.match(/[\x00-\x08\x0e-\x1f\x7f-\x9f]/g) ?? []).length;
  expect(
    unprintable / body.length,
    `${label} did not decode to text (${unprintable}/${body.length} unprintable ` +
      `bytes). Anything read out of this body is noise, not a measurement.`
  ).toBeLessThan(0.02);
}

test.afterAll(async () => {
  await resetTestHousehold();
});

/**
 * ⚠️ BUG-059's cause, and the reason this harness could never have worked.
 *
 * posthog-js drops EVERY event — analytics and session replay alike — when it
 * decides the browser is a robot. The gate is the first line of `capture()`:
 *
 *   const bot = !this.config.opt_out_useragent_filter && this._is_bot()
 *   if (!bot || this.config.__preview_capture_bot_pageviews) { …actually send… }
 *
 * and `_is_bot()` is true if ANY of three things hold: the user-agent string
 * matches the built-in blocklist (which contains `"headlesschrome"`), the
 * `userAgentData.brands` match it, or `navigator.webdriver` is set.
 *
 * **A headless Playwright browser trips two of the three independently.**
 *
 * ⚠️ It explains every observed symptom and eliminates none of the four
 * suspects the tracker had already ruled out, because it is upstream of all of
 * them: `init()` has no bot gate, so remote config is fetched and
 * `posthog-recorder.js` is downloaded exactly as observed; the gate is a silent
 * early return, so there is no error and no warning; and replay chunks ride
 * `capture("$snapshot")`, so `/s/` dies with `/i/v0/e/`.
 *
 * ⚠️ The production config is CORRECT and stays untouched. Filtering bots is
 * the behaviour we want from a real browser's point of view. The apparatus is
 * what has to change, so these two overrides are the minimum deviation that
 * makes the subject of the measurement exist at all.
 */
/**
 * The two ingest endpoints, and the only evidence that counts.
 *
 * `/s/` carries session-replay chunks, `/i/v0/e/` carries ordinary events.
 * Everything else posthog-js touches — `/array/<token>/config.js`, `/flags/`,
 * `/static/*` — happens during `init()`, which has no bot gate, and is
 * therefore present in BOTH legs of this measurement. Reading those as "PostHog
 * is working" is precisely how the symptom read as a configuration problem.
 */
const INGEST_PATHS = ["/s/", "/i/v0/e/", "/e/"] as const;

/** Outside `test-results/`, which Playwright wipes at startup. */
const WIRE_DUMP_DIR = path.join(process.cwd(), ".masking-wire");

const NOT_A_ROBOT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/**
 * A context that posthog-js will not classify as a robot.
 *
 * Built by hand rather than through `test.use()` so the deviation is visible at
 * its one call site instead of hidden in a fixture — this browser is
 * deliberately not the browser the rest of the suite runs in, and that fact
 * should be impossible to read past.
 */
async function notARobotContext(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext({
    userAgent: NOT_A_ROBOT,
    storageState: STORAGE_STATE_PATH,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // The UA string is set on the context; `userAgentData.brands` is NOT, and
    // it carries "HeadlessChrome" independently — the second of the three gates.
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  return context;
}

/**
 * The two properties posthog-js's bot check actually reads.
 *
 * ⚠️ DIAGNOSTIC ONLY — deliberately not an assertion. The obvious version of
 * this asked the SDK directly (`window.posthog._is_bot()`) and **both tests
 * failed on it**, because the npm module does NOT register the instance on
 * `window` — only `__PosthogExtensions__` and `_POSTHOG_REMOTE_CONFIG` are
 * there. Asserting through it would have been a check that fails for a reason
 * unrelated to its subject. The WIRE is the evidence; this only records which
 * browser produced it.
 */
async function readBrowserIdentity(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    webdriver: navigator.webdriver,
    ua: navigator.userAgent,
    posthogGlobals: Object.keys(window).filter((k) =>
      k.toLowerCase().includes("posthog")
    ),
  }));
}

/**
 * ⚠️ THE FORCE-FAILURE. This is the BUG-059 repro, kept deliberately, because
 * "the fix worked" is worth nothing without "the broken case was broken for the
 * reason I predicted" (S52). It runs UNSPOOFED and asserts the silence, so if
 * posthog-js ever changes its bot policy this goes red and tells us the harness
 * below is now measuring a different browser than it thinks.
 */
test("BUG-059 repro: a headless browser is silently dropped by posthog-js", async ({
  page,
}) => {
  const ingest: string[] = [];
  await page.route(/i\.posthog\.com/, async (route) => {
    ingest.push(new URL(route.request().url()).pathname);
    await route.continue();
  });

  await page.goto("/groceries");
  await page.waitForTimeout(8_000);

  const identity = await readBrowserIdentity(page);
  console.log(`[bot] unspoofed identity: ${JSON.stringify(identity)}`);

  // Both gates, asserted on the browser rather than assumed from the docs.
  expect(identity.webdriver, "navigator.webdriver is not set").toBe(true);
  expect(
    identity.ua.toLowerCase(),
    "UA does not contain a string on posthog's blocklist"
  ).toContain("headlesschrome");

  // ⚠️ The SDK did start — this is what proves the gate is in `capture()` and
  // not in `init()`, and therefore why the symptom looked so much like a
  // configuration problem.
  expect(
    ingest.length,
    "posthog never even fetched config, so this is not the bot gate"
  ).toBeGreaterThan(0);

  // The symptom, restated as an assertion: config and static assets fetched,
  // zero ingest.
  //
  // ⚠️ `/s/` EXACTLY, never `startsWith("/s")` — the first version of this line
  // matched `/static/posthog-recorder.js` and reported the recorder script as
  // ingest traffic, i.e. it claimed the bot HAD sent replay data. A prefix that
  // happens to be a prefix of something else is the same class of mistake as
  // BSD grep's `\b` in S59.
  const posted = ingest.filter((p) => INGEST_PATHS.some((i) => p.startsWith(i)));
  expect(
    posted,
    `expected total silence from a bot-classified browser, got: ${posted.join(", ")}`
  ).toEqual([]);
  console.log(
    `[bot] confirmed — ${ingest.length} requests, 0 ingest. Endpoints: ${[
      ...new Set(ingest),
    ].join(", ")}`
  );
});

test("session replay masks the grocery list on the wire", async ({ browser }) => {
  const context = await notARobotContext(browser);
  const page = await context.newPage();
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
    const buf = route.request().postDataBuffer();
    const p = new URL(url).pathname;
    if (INGEST_PATHS.some((i) => p.startsWith(i))) {
      const h = route.request().headers();
      console.log(
        `[wire] ${p} ct=${h["content-type"]} ce=${h["content-encoding"]} ` +
          `bytes=${buf?.length ?? 0} magic=${buf?.subarray(0, 8).toString("hex") ?? "-"}`
      );
    }
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

  // ⚠️ Assert the gate is OPEN before measuring anything through it. Without
  // this, a silent wire is ambiguous between "masking works" and "BUG-059
  // again", which is exactly the ambiguity that cost this measurement a
  // session — the harness could not tell a clean recording from no recording.
  const identity = await readBrowserIdentity(page);
  console.log(`[masking] spoofed identity: ${JSON.stringify(identity)}`);
  expect(identity.webdriver, "the webdriver spoof did not take").toBe(false);
  expect(
    identity.ua.toLowerCase(),
    "the UA override did not take"
  ).not.toContain("headless");

  // rrweb batches; scroll and interact so a full snapshot plus incremental
  // events are emitted, then give the flush interval time to fire.
  await page.mouse.wheel(0, 300);
  await page.getByTestId("grocery-row").first().hover();
  await page.waitForTimeout(12_000);

  // The wire, fully expanded: outer gzip undone by `readBody`, inner per-item
  // gzip undone here. This string is the first thing in this test that has ever
  // actually contained the page's rendered text.
  let innerExpanded = 0;
  const wire = seen
    .map((s) => {
      const { text, expanded } = expandSnapshots(s.body);
      innerExpanded += expanded;
      return text;
    })
    .join("\n");
  const endpoints = [...new Set(seen.map((s) => new URL(s.url).pathname))];
  console.log(`[masking] endpoints hit: ${endpoints.join(", ")}`);
  console.log(`[masking] ${seen.length} requests, ${wire.length} bytes`);

  // ⚠️ Per-request sizes, and the full decoded payload on disk. A single total
  // cannot distinguish "the replay chunk decoded to 30KB of DOM" from "the
  // replay chunk failed to decode and the 30KB is somebody else's response" —
  // and this check's entire job is to read what the recording CONTAINS.
  // ⚠️ NOT under `test-results/`: Playwright wipes that directory at startup
  // (S61 lost an 18-minute run to exactly this).
  for (const s of seen) {
    console.log(
      `[masking]   ${new URL(s.url).pathname} — ${s.body.length} bytes decoded`
    );
  }

  // ⚠️ WRITE THE DUMP BEFORE ASSERTING ANYTHING. The first version asserted
  // first, so the one run that had something to explain threw before writing
  // the file that would have explained it — an instrument that deletes its own
  // evidence at exactly the moment the evidence exists.
  const dump = `${WIRE_DUMP_DIR}/masking-wire.txt`;
  fs.mkdirSync(WIRE_DUMP_DIR, { recursive: true });
  fs.writeFileSync(
    dump,
    seen
      .map((s) => `===== ${s.url}\n${expandSnapshots(s.body).text}`)
      .join("\n\n"),
    "utf8"
  );
  console.log(
    `[masking] ${innerExpanded} inner snapshot streams expanded; full wire at ${dump}`
  );

  // ⚠️ The expansion must have DONE something. Without this, a change to how
  // posthog-js packs snapshots turns `expandSnapshots` into a no-op and every
  // assertion below goes back to reading an envelope — green, and blind. This
  // project has produced the test-that-cannot-fail three separate ways; this is
  // the guard against the fourth.
  expect(
    innerExpanded,
    "no inner snapshot stream was decompressed, so the DOM was never inspected"
  ).toBeGreaterThan(0);
  assertDecoded("expanded replay payload", wire);

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
  await context.close();
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
