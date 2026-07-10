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
  captureStatus: "ok" | "state-mismatch" | "error";
  error?: string;
}

export interface CaptureRunMeta {
  timestamp: string;
  layer: string;
  sectionKey: string;
  viewport: { width: number; height: number };
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
async function settleAndShoot(page: Page, filePath: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
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

async function captureOne(
  page: Page,
  def: CaptureStateDef,
  runDir: string,
  sectionKey: string
): Promise<ManifestEntry> {
  const screenshot = `${def.id}.png`;
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

    const section = await waitForHudSection(page, sectionKey, def.expectedState);
    const assertedState =
      section && typeof section.derivedState === "string"
        ? (section.derivedState as string)
        : null;
    const observed = extractObserved(section);

    let captureStatus: ManifestEntry["captureStatus"] = "ok";
    if (def.expectedState && assertedState !== def.expectedState) {
      captureStatus = "state-mismatch";
    }

    await hideHudChrome(page);
    await settleAndShoot(page, path.join(runDir, screenshot));

    return {
      id: def.id,
      briefRef: def.briefRef,
      expectedState: def.expectedState,
      assertedState,
      observed,
      facts: def.facts,
      screenshot,
      captureStatus,
    };
  } catch (err) {
    return {
      id: def.id,
      briefRef: def.briefRef,
      expectedState: def.expectedState,
      assertedState: null,
      facts: def.facts,
      screenshot,
      captureStatus: "error",
      error: err instanceof Error ? err.message : String(err),
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
  await enableHud(page);
  const entries: ManifestEntry[] = [];
  for (const def of defs) {
    entries.push(await captureOne(page, def, runDir, meta.sectionKey));
  }
  writeManifest(runDir, meta, entries);
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
