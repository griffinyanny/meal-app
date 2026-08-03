// GENERIC capture runtime — copyable to any app using this harness + debug HUD.
// Drives the browser to a set of named UI states, verifies each state against the
// debug HUD BEFORE shooting (the anti-hallucination guard), hides the HUD chrome,
// and emits PNGs + a manifest.json of ground-truth facts for the critique layer
// (Claude reading the PNGs) to anchor against.
import { type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export interface CaptureStateDef {
  id: string;
  // Expected debug-HUD derivedState; asserted before the shot (mismatch → flagged).
  expectedState?: string;
  // Ground-truth facts the critique verifies are visibly true in the pixels.
  facts?: Record<string, unknown>;
  briefRef?: string;
  // App-provided: seed / DB setup for this state (closes over seedPlanState).
  prepare?: () => Promise<unknown>;
  // Navigate + any interactions to reach the state (goto, open a sheet, etc.).
  navigate: (page: Page) => Promise<void>;
  // Visible text that proves the SETTLED state has rendered (not a loading
  // skeleton). Waited for before the HUD poll + shot. Strongly recommended.
  readyText?: string;
  // Per-state opt-out of the HUD poll, overriding the run-level `useHud`.
  //
  // Needed by any state that ends with an OPEN DRAWER: reading the HUD means
  // clicking its toggle, and a drawer's scrim intercepts that click, so the poll
  // hangs until it times out. Such a state gates on `readyText` alone — which
  // for a sheet is the stronger guard anyway, since derivedState describes the
  // plan underneath and knows nothing about what is on top of it.
  useHud?: boolean;
  // Shoot at the real device viewport instead of growing it to content height.
  //
  // The grow trick exists so `position: fixed` chrome lands at the true page
  // bottom on a SCROLLING page. For a state whose subject is itself pinned to
  // the viewport — a sheet, a drawer — it does the opposite: vaul does not
  // reflow to a programmatic resize, so the sheet keeps its 844-based geometry
  // while the fixed tab bar drops to the new bottom, opening a gap that does
  // not exist on a phone. Measured rather than guessed: with the picker open at
  // 390×844 the sheet spans 418→844, the nav spans 779→844, and the topmost
  // element at the nav's centre is the sheet's own tile grid.
  //
  // Everything worth judging about a sheet is viewport-relative — the top
  // inset, the max height, whether the action bar is reachable — so a grown
  // shot cannot answer any of it. Cost: content below the fold is out of frame,
  // which is correct, because on a phone it is off the screen too.
  viewportOnly?: boolean;
}

export interface ObservedFacts {
  status?: string | null;
  slotCount?: number;
  slotTitles?: (string | null)[];
}

export interface ManifestEntry {
  id: string;
  briefRef?: string;
  expectedState?: string;
  assertedState?: string | null;
  // What the debug HUD actually reported at capture time (DOM/state ground truth,
  // not vision) — the critique cross-checks the pixels against this.
  observed?: ObservedFacts;
  facts?: Record<string, unknown>;
  screenshot: string;
  captureStatus: "ok" | "state-mismatch" | "error" | "in-flight";
  error?: string;
  // Wall-clock for this state. A capture that dies at its test budget says
  // nothing about WHERE the time went; per-state timing is what turns "the run
  // blew 120s" into "one state ate 15 of them waiting on text that never came."
  durationMs?: number;
  // Only written for a state that did NOT reach "ok": where the page actually
  // was and what it was actually showing. A readyText timeout reports the string
  // it wanted and never the string it got, which is the half that identifies
  // the bug.
  diagnostics?: {
    url?: string;
    visibleText?: string;
  };
}

export interface CaptureRunMeta {
  timestamp: string;
  layer: string;
  sectionKey: string;
  viewport: { width: number; height: number };
  // Whether this tab publishes a debug-HUD section to poll before each shot.
  // Only Plan does; set false for tabs without one (Groceries/Recipes) so we
  // don't click the global HUD toggle — a click that a state's open drawer scrim
  // would intercept and hang on. Defaults to true.
  useHud?: boolean;
}

// Turn on the debug HUD for this context (mirrors debug-hud.spec.ts). Must run
// before the first navigation so the localStorage flag is set at load.
export async function enableHud(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("debug-hud", "1");
    } catch {
      // storage unavailable — HUD simply won't enable; readHudState returns null
    }
  });
}

function parseSection(
  text: string,
  sectionKey: string
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const section = parsed[sectionKey];
    return section && typeof section === "object"
      ? (section as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// Open the HUD and poll its live JSON until derivedState === expectedState (the
// plan query resolves async after navigation, so an immediate read catches the
// initial empty/loading frame). Returns the last-seen section; leaves the panel
// closed. If expectedState is omitted, reads once. Returns null if no HUD.
export async function waitForHudSection(
  page: Page,
  sectionKey: string,
  expectedState: string | undefined,
  timeoutMs = 10_000
): Promise<Record<string, unknown> | null> {
  const toggle = page.getByTestId("debug-hud-toggle");
  if ((await toggle.count()) === 0) return null;
  await toggle.click();
  const pre = page.getByTestId("debug-hud-panel").locator("pre");
  await pre.waitFor({ state: "visible", timeout: 5_000 });

  let section = parseSection(await pre.innerText(), sectionKey);
  if (expectedState) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && section?.derivedState !== expectedState) {
      await page.waitForTimeout(150);
      section = parseSection(await pre.innerText(), sectionKey);
    }
  }
  await toggle.click(); // close
  return section;
}

// Hide every debug-HUD element so it never lands in the screenshot. Zero app change.
async function hideHudChrome(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '[data-testid^="debug-hud"]{display:none!important}',
  });
}

// Shoot the whole screen WITHOUT fullPage: instead grow the viewport to the
// content height, so position:fixed chrome (the bottom tab bar) lands at the true
// page bottom rather than being stitched mid-page (the fullPage+fixed artifact).
async function settleAndShoot(
  page: Page,
  filePath: string,
  viewportOnly = false
): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  if (viewportOnly) {
    await page.screenshot({ path: filePath, animations: "disabled" });
    return;
  }
  const width = page.viewportSize()?.width ?? 390;
  const contentHeight = await page.evaluate(() =>
    Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    )
  );
  const height = Math.min(contentHeight, 6000);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(150); // let layout settle after the resize
  await page.screenshot({ path: filePath, animations: "disabled" });
  await page.setViewportSize({ width, height: 844 }); // restore for the next state
}

export function makeRunDir(baseDir: string, timestamp: string): string {
  const dir = path.join(baseDir, timestamp);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extractObserved(
  section: Record<string, unknown> | null
): ObservedFacts | undefined {
  if (!section) return undefined;
  const slots = Array.isArray(section.slots)
    ? (section.slots as Array<Record<string, unknown>>)
    : [];
  return {
    status: typeof section.status === "string" ? section.status : null,
    slotCount: slots.length,
    slotTitles: slots.map((s) =>
      typeof s.title === "string" ? s.title : null
    ),
  };
}

// What the page was actually showing when a state failed. Best-effort: a state
// can fail for reasons that also break these reads (a closed page, a crashed
// context), and a diagnostic that throws would replace the real error with its
// own.
async function collectDiagnostics(
  page: Page
): Promise<ManifestEntry["diagnostics"]> {
  const diagnostics: ManifestEntry["diagnostics"] = {};
  try {
    diagnostics.url = page.url();
  } catch {
    // page gone; the error we already hold is the more useful one
  }
  try {
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    diagnostics.visibleText = text.replace(/\n{2,}/g, "\n").slice(0, 1200);
  } catch {
    // ditto
  }
  return diagnostics;
}

// ⚠️ THE SEED RESETS THE SERVER. NOTHING RESET THE CLIENT. (BUG-053)
//
// The runner drives ONE page through every state in the array. Since 1F/C that
// page carries a React Query cache persisted to IndexedDB, with `staleTime:
// 30_000` — so state N's data survives into state N+1's `goto`, is restored as
// FRESH, and suppresses the refetch that would have shown the newly-seeded
// state. The capture then photographs the previous state's screen while the
// manifest labels it the new one. It is not a slow page or a bad selector: the
// seed and the screen were describing different databases.
//
// The order below is load-bearing, and it is S57's "fix a race by construction,
// not by lengthening a wait":
//   1. `about:blank` DESTROYS the live page first, so no in-flight refetch and
//      no pending persist write can land on top of what we clear. This is not
//      hypothetical — a state whose `navigate` fires a mutation leaves an
//      invalidate nobody awaits, and that refetch raced the next seed's `wipe()`
//      and cached an EMPTY list, which the three states after it then inherited.
//   2. Clear the origin's IndexedDB over CDP, because once we are on about:blank
//      there is no same-origin document left to run `indexedDB` against.
//   3. Only then seed and navigate — into a client that holds nothing.
//
// Chromium-only, like the rest of this harness (`browserName: "chromium"`).
async function resetClientState(
  page: Page,
  origin: string | null
): Promise<void> {
  await page.goto("about:blank");
  if (!origin) return; // first state: nothing has been stored yet
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Storage.clearDataForOrigin", {
      origin,
      storageTypes: "indexeddb",
    });
  } finally {
    await cdp.detach();
  }
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith("http") ? parsed.origin : null;
  } catch {
    return null;
  }
}

async function captureOne(
  page: Page,
  def: CaptureStateDef,
  runDir: string,
  sectionKey: string,
  useHud: boolean
): Promise<ManifestEntry> {
  const screenshot = `${def.id}.png`;
  const startedAt = Date.now();
  try {
    if (def.prepare) await def.prepare();
    await def.navigate(page);

    // Wait for the SETTLED state to render (past any loading skeleton) before
    // reading state or shooting — derivedState alone can be true mid-load.
    if (def.readyText) {
      await page
        .getByText(def.readyText, { exact: false })
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
    }

    const hud = def.useHud ?? useHud;
    const section = hud
      ? await waitForHudSection(page, sectionKey, def.expectedState)
      : null;
    const assertedState =
      section && typeof section.derivedState === "string"
        ? (section.derivedState as string)
        : null;
    const observed = extractObserved(section);

    let captureStatus: ManifestEntry["captureStatus"] = "ok";
    // Only a state that actually read the HUD can be mismatched against it.
    // Without this the opt-out would report every drawer state as broken.
    if (hud && def.expectedState && assertedState !== def.expectedState) {
      captureStatus = "state-mismatch";
    }

    await hideHudChrome(page);
    await settleAndShoot(page, path.join(runDir, screenshot), def.viewportOnly);

    return {
      id: def.id,
      briefRef: def.briefRef,
      expectedState: def.expectedState,
      assertedState,
      observed,
      facts: def.facts,
      screenshot,
      captureStatus,
      durationMs: Date.now() - startedAt,
      ...(captureStatus === "ok"
        ? {}
        : { diagnostics: await collectDiagnostics(page) }),
    };
  } catch (err) {
    const diagnostics = await collectDiagnostics(page);
    // Shoot the failure too. A readyText timeout means the page rendered
    // SOMETHING; the PNG of the wrong screen is the fastest read on what.
    try {
      await hideHudChrome(page);
      await page.screenshot({
        path: path.join(runDir, screenshot),
        animations: "disabled",
      });
    } catch {
      // no shot available — the text dump above still stands
    }
    return {
      id: def.id,
      briefRef: def.briefRef,
      expectedState: def.expectedState,
      assertedState: null,
      facts: def.facts,
      screenshot,
      captureStatus: "error",
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAt,
      diagnostics,
    };
  }
}

// Capture every state in order (serial — the harness is workers:1), writing PNGs
// into runDir and returning the manifest entries. Never throws on a bad state —
// records captureStatus and continues, so one broken state can't abort the run.
export async function captureStates(
  page: Page,
  defs: CaptureStateDef[],
  runDir: string,
  meta: CaptureRunMeta
): Promise<ManifestEntry[]> {
  const useHud = meta.useHud !== false;
  if (useHud) await enableHud(page);
  const entries: ManifestEntry[] = [];
  // Learned from the first navigation rather than configured, so no capture
  // file has to remember to pass it — the reset simply no-ops until there is
  // something to reset.
  let origin: string | null = null;
  for (const def of defs) {
    // ⚠️ The manifest is written BEFORE the state runs and again after it, with
    // an `in-flight` placeholder in between. The manifest is the only artifact
    // that says WHICH state failed, and a run that dies at Playwright's test
    // budget is exactly the run where that matters — yet a single write at the
    // end is the one thing a hard timeout destroys. S61 lost a whole Groceries
    // pass this way: the run blew 120s and left no record of where.
    entries.push({
      id: def.id,
      briefRef: def.briefRef,
      expectedState: def.expectedState,
      screenshot: `${def.id}.png`,
      captureStatus: "in-flight",
    });
    writeManifest(runDir, meta, entries);

    await resetClientState(page, origin);
    const entry = await captureOne(page, def, runDir, meta.sectionKey, useHud);
    origin = originOf(page.url()) ?? origin;
    entries[entries.length - 1] = entry;
    writeManifest(runDir, meta, entries);
    console.log(
      `CAPTURE_STATE ${def.id} ${entry.captureStatus} ${entry.durationMs}ms`
    );
  }
  return entries;
}

export function writeManifest(
  runDir: string,
  meta: CaptureRunMeta,
  entries: ManifestEntry[]
): void {
  const manifest = { run: meta, states: entries };
  fs.writeFileSync(
    path.join(runDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  // Pointer so the critique step can find the newest run without a directory scan.
  fs.writeFileSync(
    path.join(runDir, "..", ".last-run"),
    path.basename(runDir)
  );
}
