// Layer A capture: drives the Plan tab to each deterministic seed state (mock
// content) and emits PNGs + manifest.json for the critique layer. Not a test in
// the pass/fail sense — it produces artifacts; a non-"ok" captureStatus is itself
// a caught bug and is surfaced in the output.
import { test } from "@playwright/test";
import path from "node:path";
import { captureStates, makeRunDir } from "../harness/capture-runtime";
import { LAYER_A_STATES, PLAN_SECTION_KEY } from "./expected-facts";
import { resetTestHousehold } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

test("capture Plan-tab states (Layer A — mock)", async ({ page }) => {
  // Raised from 120s with Slice 2 (S47). Plan now captures 17 states and six of
  // them are interaction-driven — a seed, a navigation and up to three taps
  // each — so the old budget ran out mid-run. It does not fail loudly when it
  // does: the states after the cut come back as errors and the browser closes
  // under the ones still queued, which reads as five broken states rather than
  // one exhausted clock.
  test.setTimeout(300_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `A-${timestamp}`);

  const entries = await captureStates(page, LAYER_A_STATES, runDir, {
    timestamp,
    layer: "A-mock",
    sectionKey: PLAN_SECTION_KEY,
    viewport: { width: 390, height: 844 },
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
