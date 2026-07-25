// Layer B capture: drives the onboarding interview's FREE-TEXT path against the
// real model (OpenAI) and screenshots what actually comes back. Nondeterministic
// → an audit, never a gate. Runs only under playwright.capture-live.config.ts
// (E2E_LIVE_CAPTURE=1).
//
// What this exists to catch, specifically: the "what I caught" tray renders the
// OPS `user.talk` produced, not the chef's sentence. That works beautifully
// against a fixture written to produce `add_cuisine` and `add_avoid` — and would
// silently degrade to a wall of prose if the real model prefers `remember` for
// the same message. Layer A cannot see that; only this can. Everything else on
// the surface (the reflect hook, the summary, the seed chips) is deterministic
// and needs no live check.
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import {
  captureStates,
  makeRunDir,
  type CaptureStateDef,
} from "../harness/capture-runtime";
import { ONBOARDING_SECTION_KEY } from "./onboarding-facts";
import { resetTestHousehold, seedOnboardingState } from "../app/seed";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

const firstRun = () => seedOnboardingState("ONBOARDING_NEW");

// Real calls are slow enough that the tray needs a generous wait; a timeout here
// is itself a finding (the field would feel dead to a first-run user).
async function tellTheChef(page: Page, text: string): Promise<void> {
  await page.getByTestId("onboarding-tell-me-input").fill(text);
  await page.getByTestId("onboarding-tell-me-send").click();
  await expect(page.getByTestId("onboarding-caught-tray")).toBeVisible({
    timeout: 60_000,
  });
}

async function gotoDiet(page: Page): Promise<void> {
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();
  await expect(page.getByText("How do you eat?")).toBeVisible();
}

const LIVE_STATES: CaptureStateDef[] = [
  {
    id: "live-ob-caught-diet",
    briefRef: "real user.talk — a mixed message on the diet turn",
    facts: {
      said: "We went pescatarian last year, and we love Thai food",
      expect:
        "the Pescatarian pill lit by the words alone, and Thai in the tray as its own item — NOT a paragraph, and NOT the diet restated in both places",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDiet(page);
      await tellTheChef(page, "We went pescatarian last year, and we love Thai food");
    },
  },
  {
    id: "live-ob-caught-safety",
    briefRef: "real user.talk — two avoids at once on the safety turn",
    facts: {
      said: "I'm allergic to shellfish and my wife can't do peanuts",
      expect:
        "both foods itemized as avoids, each carrying the allergy marker; over-protecting is the only acceptable error direction on this turn",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDiet(page);
      await page.getByTestId("onboarding-option-pescatarian").click();
      await page.getByTestId("onboarding-confirm").click();
      await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
      await tellTheChef(page, "I'm allergic to shellfish and my wife can't do peanuts");
    },
  },
  {
    id: "live-ob-caught-nuance",
    briefRef: "real user.talk — free-form nuance with no typed field to land in",
    facts: {
      said: "We do taco night every Tuesday and nobody here eats mushrooms",
      expect:
        "the Tuesday habit filed as a memory item and mushrooms as a dislike — the case where the tray is the ONLY place the capture is visible",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDiet(page);
      await tellTheChef(
        page,
        "We do taco night every Tuesday and nobody here eats mushrooms"
      );
    },
  },
];

test("capture onboarding REAL free-text capture (Layer B — live model)", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = makeRunDir(CAPTURES_DIR, `B-onboarding-${timestamp}`);

  const entries = await captureStates(page, LIVE_STATES, runDir, {
    timestamp,
    layer: "B-live",
    sectionKey: ONBOARDING_SECTION_KEY,
    viewport: { width: 390, height: 844 },
    useHud: false,
  });

  console.log(`CAPTURE_DIR=${runDir}`);
  for (const e of entries) {
    console.log(`LIVE ${e.id}: ${e.captureStatus}${e.error ? " — " + e.error : ""}`);
  }
});

test.afterAll(async () => {
  await seedOnboardingState("ONBOARDING_DONE");
  await resetTestHousehold();
});
