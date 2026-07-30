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
import { resetTestHousehold, seedPlanState } from "../app/seed";
import { confirmBar, mealRow, planRail } from "../app/selectors";
import { todayISO, addDaysISO } from "../../../src/components/plan/plan-helpers";

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
    recordVoice(id, section);
  };
}

/** Per-run, per-state cost readings. Judged in the log below, not asserted —
 *  Layer B is an audit of real output, never a gate (the model is stochastic). */
const LIVE_COSTS = new Map<
  string,
  Array<{ title: string | null; cents: number | null }>
>();

/** BUG-034's two strings, as the real model actually wrote them. */
const LIVE_VOICE = new Map<
  string,
  { summary: string | null; note: string | null }
>();

/** §B's named-night guarantee, as the comparison rather than the conclusion. */
const LIVE_PICKS = new Map<
  string,
  { askedDate: string | null; landedDate: string | null; rationale: string | null }
>();

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function recordVoice(id: string, section: Record<string, unknown> | null): void {
  LIVE_VOICE.set(id, {
    summary: str(section?.chefSummary),
    note: str(section?.chefNote),
  });
}

/**
 * Read back which night the pick landed on.
 *
 * The eyebrow says THAT a row is a pick; it cannot say which night was asked
 * for. So the comparison has to come from outside the screen: the caller knows
 * the night it opened the picker from, and the HUD knows where the slot ended
 * up. Neither alone is the guarantee.
 */
async function recordPick(
  page: Page,
  id: string,
  askedDate: string | null
): Promise<void> {
  const section = await waitForHudSection(page, PLAN_SECTION_KEY, "review");
  recordVoice(id, section);
  const slots = Array.isArray(section?.slots)
    ? (section.slots as Array<Record<string, unknown>>)
    : [];
  const picked = slots.find((s) => str(s.pickedRecipeId) != null);
  LIVE_PICKS.set(id, {
    askedDate,
    landedDate: str(picked?.date),
    rationale: str(picked?.rationale),
  });
}

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

  // ── The pick path (W8/W9) — three guarantees that are PROMPT-SHAPED ──────
  //
  // Everything below rides a SEEDED week rather than a generated one. The
  // guarantees under test belong to `plan.pick`'s prompt, not to generation, so
  // seeding the week buys the same evidence for one real call instead of two —
  // and the S40/S45 precedent is that prompt-shaped guarantees are exactly the
  // ones that fail live in ways the mock cannot show.
  {
    id: "live-pick-named-night",
    briefRef: "ledger §B + frame 3e — a named night is HONOURED, not a hint",
    expectedState: "review",
    facts: {
      // `3e`'s primary reads "Put it on <day>". If the chef answers with a
      // different night, that button is a lie — which is the contradiction S46
      // caught in its own build and fixed by sending the day.
      pickedFromDayOffset: 1,
      expectPickToLandOnThatDay: true,
      // §B: a picked meal's rationale argues PLACEMENT, not the dish.
      expectRationaleToArguePlacement: true,
      // §B: "the boundary is STATED, not enforced silently."
      expectBoundaryInTheChefsOwnWords: true,
    },
    prepare: () => seedPlanState("PICKABLE"),
    navigate: async (page) => {
      await page.goto("/plan");
      await planRail(page).waitFor({ state: "visible", timeout: 30_000 });
      await mealRow(page, addDaysISO(todayISO(), 1)).click();
      await page.getByTestId("library-door").click();
      await page
        .getByTestId("picker-row")
        .filter({ hasText: "Sichuan Dry-Fried Green Beans" })
        .click();
      await page.getByTestId("picker-confirm").click();
      // The real model is answering here, so wait on the ANSWER rather than a
      // fixed delay: the picked row carries its provenance once it lands.
      await page
        .locator("[data-meal-date]")
        .filter({ hasText: "PICKED" })
        .first()
        .waitFor({ timeout: 120_000 });
      await recordPick(page, "live-pick-named-night", addDaysISO(todayISO(), 1));
    },
  },
  {
    id: "live-pick-chef-chooses",
    briefRef: "ledger §B — with NO night named, the chef answers with one",
    expectedState: "review",
    facts: {
      // The other half of the same rule, and the half `3b` captions: "The chef
      // picks the nights." `Add to this week` sends no day at all.
      pickedFromRecipesDetail: true,
      expectChefToNameANight: true,
      expectAnswerToReplaceTheAsk: true,
    },
    prepare: () => seedPlanState("PICKABLE"),
    navigate: async (page) => {
      await page.goto("/recipes");
      await page
        .getByText("Congee with Ginger and Scallion", { exact: false })
        .first()
        .click();
      await page
        .locator('[data-testid="add-to-week"]:not([disabled])')
        .click();
      // §C's rule, applied on Recipes: the answer REPLACES the ask rather than
      // sitting beside it, so the ask disappearing is the settled signal.
      // The chef's answer, in its own words, on the screen it was asked from.
      const answer = page.getByTestId("add-to-week-answer");
      await answer.waitFor({ timeout: 120_000 });
      console.log(
        `ANSWER live-pick-chef-chooses: ${JSON.stringify(await answer.innerText())}`
      );
      // Then read where it actually put it. `askedDate` is null here BY DESIGN
      // — this invocation names no night, so there is nothing to compare
      // against and the guarantee is only that the chef chose one and said so.
      await page.goto("/plan");
      await planRail(page).waitFor({ state: "visible", timeout: 30_000 });
      await recordPick(page, "live-pick-chef-chooses", null);
    },
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

    // BUG-034 on real output. The screen renders these at two sizes, which is
    // precisely what makes a too-long claim hard to SEE — so print them apart,
    // with lengths, and judge each against its own job: the claim is what you
    // read at a glance, the note is the argument under it.
    const voice = LIVE_VOICE.get(e.id);
    if (voice) {
      console.log(
        `VOICE ${e.id}: claim (${voice.summary?.length ?? 0} chars) ${JSON.stringify(voice.summary)}`
      );
      console.log(
        `VOICE ${e.id}: note  (${voice.note?.length ?? 0} chars) ${JSON.stringify(voice.note)}`
      );
    }

    // §B's named-night guarantee, printed as the comparison rather than the
    // conclusion: which night was asked for, which night it landed on, and what
    // the chef said about it.
    const pick = LIVE_PICKS.get(e.id);
    if (pick) {
      console.log(
        `PICK ${e.id}: asked=${pick.askedDate ?? "(chef chooses)"} landed=${pick.landedDate ?? "(none)"} ` +
          `${pick.askedDate && pick.landedDate ? (pick.askedDate === pick.landedDate ? "✅ HONOURED" : "❌ MOVED") : ""}`
      );
      console.log(`PICK ${e.id}: rationale ${JSON.stringify(pick.rationale)}`);
    }

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
