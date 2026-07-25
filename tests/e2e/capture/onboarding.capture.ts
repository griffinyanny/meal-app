// Layer A capture: walks the first-run onboarding interview to each of its
// screens (mock content) and emits PNGs + manifest.json for the critique layer.
// Not a pass/fail test — it produces artifacts; a non-"ok" captureStatus is a
// caught bug.
import { test } from "@playwright/test";
import path from "node:path";
import { captureStates, makeRunDir } from "../harness/capture-runtime";
import {
  ONBOARDING_CAPTURE_STATES,
  ONBOARDING_SECTION_KEY,
} from "./onboarding-facts";
import { resetTestHousehold, seedOnboardingState } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

test("capture onboarding-interview states (Layer A — mock)", async ({ page }) => {
  test.setTimeout(300_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `A-onboarding-${timestamp}`);

  const entries = await captureStates(page, ONBOARDING_CAPTURE_STATES, runDir, {
    timestamp,
    layer: "A-mock",
    sectionKey: ONBOARDING_SECTION_KEY,
    viewport: { width: 390, height: 844 },
    useHud: false, // No HUD section on this surface; states gate on readyText.
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

// This file is the only capture that puts the shared test user back into the
// first-run state, and a user left mid-interview would redirect every other
// capture (and every spec) to /welcome. Restoring the onboarded default is part
// of this file's contract, exactly as it is in onboarding.spec.ts.
test.afterAll(async () => {
  await seedOnboardingState("ONBOARDING_DONE");
  await resetTestHousehold();
});
