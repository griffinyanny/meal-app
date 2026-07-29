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
  waitForHudSection,
  type CaptureStateDef,
} from "../harness/capture-runtime";
import { PLAN_SECTION_KEY } from "./expected-facts";
import { resetTestHousehold } from "../app/seed";
import { confirmBar } from "../app/selectors";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/e2e/captures");

// Each intent: reset to EMPTY, open /plan, tap the suggestion pill, wait for the
// real generation to stream in and settle on the review.
//
// ── BUG-030 ───────────────────────────────────────────────────────────────
// This file was the one Plan spec S44's BUG-024 migration missed. It waited on
// "Your week, ready to review" — the hero the rail deleted — so every run timed
// out at 90s AFTER the real generation had already been paid for. A stale
// selector fails loudly and cheaply everywhere else in the suite; here it fails
// silently and bills you, which is the argument for migrating Layer B in the
// same pass as Layer A rather than "when we next run it".
//
// The settled signal is now the DRAFT'S DECISION, not a heading. W5 makes the
// full rail arrive in the first second with every slot present and then resolve
// in place, so `planRail` proves nothing about whether generation finished —
// waiting on it would screenshot a wall of provisional rows. The floating
// primary is the honest anchor: it appears only once the week is written and a
// decision is being asked of you (§C — the count slot owns it until then).
function generateVia(
  id: string,
  pill: string
): (page: Page) => Promise<void> {
  return async (page) => {
    await page.goto("/plan");
    await page.getByRole("button", { name: pill, exact: true }).click();
    await confirmBar(page).waitFor({ state: "visible", timeout: 90_000 });

    // W6's per-slot estimates, read off the HUD while this week is still on
    // screen. `ObservedFacts` is generic (it carries titles only) and this is
    // the app-specific half, so it stays here rather than widening the runtime.
    const section = await waitForHudSection(page, PLAN_SECTION_KEY, "review");
    const slots = Array.isArray(section?.slots)
      ? (section.slots as Array<Record<string, unknown>>)
      : [];
    LIVE_COSTS.set(
      id,
      slots.map((s) => ({
        title: typeof s.title === "string" ? s.title : null,
        cents: typeof s.estCostCents === "number" ? s.estCostCents : null,
      }))
    );
  };
}

/** Per-run, per-state cost readings. Judged in the log below, not asserted —
 *  Layer B is an audit of real output, never a gate (the model is stochastic). */
const LIVE_COSTS = new Map<
  string,
  Array<{ title: string | null; cents: number | null }>
>();

const LIVE_STATES: CaptureStateDef[] = [
  {
    id: "live-healthy-weeknight",
    briefRef: "real generation — 'Healthy weeknight dinners'",
    expectedState: "review",
    facts: { intent: "Healthy weeknight dinners", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("live-healthy-weeknight", "Healthy weeknight dinners"),
  },
  {
    id: "live-grill",
    briefRef: "real generation — 'I want to grill' (variety stress)",
    expectedState: "review",
    facts: { intent: "I want to grill", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("live-grill", "I want to grill"),
  },
  {
    id: "live-fridge",
    briefRef: "real generation — 'Use what's in my fridge'",
    expectedState: "review",
    facts: { intent: "Use what's in my fridge", expectMinSlots: 5 },
    prepare: () => resetTestHousehold(),
    navigate: generateVia("live-fridge", "Use what's in my fridge"),
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

    // W6 is the reason this run exists as much as W1 is: `estCostCents` is a
    // brand-new field and the real model has never been asked for it. Printed
    // per slot with the sum, because the sum is the only part the screen shows
    // and it is the part that can look reasonable while the parts do not.
    const costs = LIVE_COSTS.get(e.id) ?? [];
    const priced = costs.filter((c) => c.cents != null);
    const sum = priced.reduce((t, c) => t + (c.cents ?? 0), 0);
    console.log(
      `COST ${e.id}: ${priced.length}/${costs.length} priced, sum $${(sum / 100).toFixed(2)}`
    );
    for (const c of costs) {
      const money = c.cents == null ? "—" : `$${(c.cents / 100).toFixed(2)}`;
      console.log(`  ${money.padStart(7)}  ${c.title ?? "(no title)"}`);
    }
  }
});

test.afterAll(async () => {
  await resetTestHousehold();
});
