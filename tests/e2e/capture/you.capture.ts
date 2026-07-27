// Layer A capture: drives the You tab to each deterministic seed state (mock
// content) and emits PNGs + manifest.json for the critique layer. Not a pass/fail
// test — it produces artifacts; a non-"ok" captureStatus is a caught bug.
import { test } from "@playwright/test";
import path from "node:path";
import { captureStates, makeRunDir } from "../harness/capture-runtime";
import { YOU_CAPTURE_STATES, YOU_SECTION_KEY } from "./you-facts";
import { resetTestHousehold } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

test("capture You-tab states (Layer A — mock)", async ({ page }) => {
  test.setTimeout(120_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `A-you-${timestamp}`);

  const entries = await captureStates(page, YOU_CAPTURE_STATES, runDir, {
    timestamp,
    layer: "A-mock",
    sectionKey: YOU_SECTION_KEY,
    viewport: { width: 390, height: 844 },
    useHud: false, // You publishes no HUD section; a chef-sheet scrim would block the toggle.
  });

  console.log(`CAPTURE_DIR=${runDir}`);
  for (const e of entries) {
    if (e.captureStatus !== "ok") {
      console.log(
        `CAPTURE_ISSUE ${e.id}: ${e.captureStatus}${e.error ? " — " + e.error : ""}`
      );
    }
  }
});

test.afterAll(async () => {
  await resetTestHousehold();
});
