// Layer A capture: drives the Groceries tab to each deterministic seed state
// (mock content) and emits PNGs + manifest.json for the critique layer. Not a
// pass/fail test — it produces artifacts; a non-"ok" captureStatus is a caught
// bug surfaced in the output.
import { test } from "@playwright/test";
import path from "node:path";
import { captureStates, makeRunDir } from "../harness/capture-runtime";
import { GROCERY_CAPTURE_STATES, GROCERY_SECTION_KEY } from "./groceries-facts";
import { resetTestHousehold } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

test("capture Groceries-tab states (Layer A — mock)", async ({ page }) => {
  test.setTimeout(120_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `A-groceries-${timestamp}`);

  const entries = await captureStates(page, GROCERY_CAPTURE_STATES, runDir, {
    timestamp,
    layer: "A-mock",
    sectionKey: GROCERY_SECTION_KEY,
    viewport: { width: 390, height: 844 },
    useHud: false, // Groceries publishes no HUD section; skip the toggle (a chef-sheet scrim would block it).
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
