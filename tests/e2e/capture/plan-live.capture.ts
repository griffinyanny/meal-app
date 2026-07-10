// Layer B capture: drives REAL generations (OpenAI) across a few intents and
// screenshots the actual content — the audit that catches variety ("7 grilled
// salads"), chip phrasing (imperatives vs adjectives), and real-string layout,
// which the mocked Layer A is blind to. Nondeterministic → an audit, never a
// gate. Runs only under playwright.capture-live.config.ts (E2E_LIVE_CAPTURE=1).
import { test, type Page } from "@playwright/test";
import path from "node:path";
import {
  captureStates,
  makeRunDir,
  type CaptureStateDef,
} from "./capture-runtime";
import { PLAN_SECTION_KEY } from "./expected-facts";
import { resetTestHousehold } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

// Each intent: reset to EMPTY, open /plan, tap the suggestion pill, wait for the
// real generation to stream in and settle on the review.
function generateVia(pill: string): (page: Page) => Promise<void> {
  return async (page) => {
    await page.goto("/plan");
    await page.getByRole("button", { name: pill, exact: true }).click();
    await page
      .getByRole("heading", { name: "Your week, ready to review" })
      .waitFor({ state: "visible", timeout: 90_000 });
  };
}

const LIVE_STATES: CaptureStateDef[] = [
  {
    id: "live-healthy-weeknight",
    briefRef: "real generation — 'Healthy weeknight dinners'",
    expectedState: "review",
    facts: { intent: "Healthy weeknight dinners", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("Healthy weeknight dinners"),
  },
  {
    id: "live-grill",
    briefRef: "real generation — 'I want to grill' (variety stress)",
    expectedState: "review",
    facts: { intent: "I want to grill", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("I want to grill"),
  },
  {
    id: "live-fridge",
    briefRef: "real generation — 'Use what's in my fridge'",
    expectedState: "review",
    facts: { intent: "Use what's in my fridge", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("Use what's in my fridge"),
  },
];

test("capture Plan-tab REAL generations (Layer B — live model)", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `B-${timestamp}`);

  const entries = await captureStates(page, LIVE_STATES, runDir, {
    timestamp,
    layer: "B-live",
    sectionKey: PLAN_SECTION_KEY,
    viewport: { width: 390, height: 844 },
  });

  console.log(`CAPTURE_DIR=${runDir}`);
  for (const e of entries) {
    const titles = (e.observed?.slotTitles ?? []).filter(Boolean).join(" | ");
    console.log(`LIVE ${e.id}: ${e.captureStatus} — ${titles}`);
  }
});

test.afterAll(async () => {
  await resetTestHousehold();
});
