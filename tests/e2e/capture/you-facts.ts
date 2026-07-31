// App-specific (meal-app): the You-tab capture states + ground-truth facts for the
// Layer-A visual QA. You publishes no debug-HUD section, so states gate on readyText
// + facts (the runtime handles a missing HUD gracefully). Copy strings are verified
// against the components. Some states drive a small interaction in navigate() (open
// the chef sheet, open a field editor) and wait for the resulting element first.
import { type Page } from "@playwright/test";
import { seedYouState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

// No HUD section on this tab; a nominal key for the manifest meta.
export const YOU_SECTION_KEY = "you";

// The test-mode card renders off its own `devToolsEnabled` query, which resolves
// AFTER the page's ready text. Without waiting for it the shot either misses the
// card entirely or catches it landing mid-measure, which is what put the You tab's
// last card underneath the fixed tab bar in the S39 run. Not an app bug — a
// capture that photographed the page before it had finished arriving.
async function settleDevTools(page: Page): Promise<void> {
  await page.getByTestId("you-reset-onboarding").waitFor({ timeout: 10_000 });
}

async function gotoYou(page: Page): Promise<void> {
  await page.goto("/you");
  await settleDevTools(page);
}

async function gotoReturning(page: Page): Promise<void> {
  await page.goto("/you");
  await page.getByText("Here's what I know about you.").waitFor({ timeout: 15_000 });
  await settleDevTools(page);
}

export const YOU_CAPTURE_STATES: CaptureStateDef[] = [
  {
    id: "you-returning",
    briefRef: "You.dc.html — Direction A returning-user audit surface",
    readyText: "Here's what I know about you.",
    facts: {
      narrativeHero: "chef's-voice prose read of the cook + 'Talk to the chef' CTA",
      safetyCard:
        "red 'I never cook with' card + SAFETY-CRITICAL badge; Shellfish (with 'allergy' sub-label), No pork",
      softCard:
        "dislikes (Cilantro, Blue cheese) + cuisines (Mediterranean, Thai, Mexican) + Eating/Cooking for/Time fields",
      ledgerProvenance:
        "'What I've picked up' — 3 of 5 memories with 'You told me when we started' / 'You told me' / 'I noticed' labels + expand toggle",
      accountFooter: "name, email, household, Sign out",
      testModeCard:
        "S39 test mode: a dashed-border 'TEST MODE' card near the account footer with a quiet 'Restart onboarding' action. Visible here only because the capture server allowlists the harness identity; a normal account sees nothing.",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: gotoReturning,
  },
  {
    id: "you-test-mode",
    briefRef: "You — test mode at rest (S39; server-gated by DEV_TOOLS_EMAILS)",
    readyText: "Restart onboarding",
    facts: {
      subordinate:
        "a dashed-border card below the account footer: 'TEST MODE' eyebrow, one sentence of what it clears, and a quiet 'Restart onboarding' text action",
      clearsTabBar:
        "the card sits fully above the bottom tab bar — it is the last thing on the page and must not run under the fixed nav",
      honestScope:
        "the copy says memories from real use are kept, because the mutation only deletes sourceType:'onboarding' rows",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: gotoReturning,
  },
  {
    id: "you-test-mode-armed",
    briefRef: "You — test mode armed (S39; the two-step confirm before a destructive reset)",
    readyText: "Yes, start over",
    facts: {
      twoStep:
        "'Restart onboarding' has been replaced in place by 'Yes, start over' (destructive weight) + 'Cancel' — the card does not grow a dialog",
      quiet:
        "the card stays visually subordinate to the audit content above it; test mode is a tool, not a feature",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: async (page) => {
      await gotoReturning(page);
      await page.getByTestId("you-reset-onboarding").click();
      await page.getByTestId("you-reset-onboarding-confirm").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "you-new",
    briefRef: "You.dc.html — new-user 'We've just met' / 'Still learning'",
    readyText: "We've just met.",
    facts: {
      sparseNarrative: "honest 'here's the little I know so far' prose, no cheerleading",
      stillLearning: "'Still learning' eyebrow + 'Nothing here yet.' empty ledger",
      accountFooter: "present",
    },
    prepare: () => seedYouState("YOU_NEW"),
    navigate: gotoYou,
  },
  {
    id: "you-chef-sheet",
    briefRef: "You.dc.html — Talk-to-the-Chef capture sheet (the AI-first hero)",
    readyText: "Tell me what's changed.",
    facts: {
      suggestionPills:
        "I'm not pescatarian anymore / I'm allergic to gluten / Actually I do like cream / Add Japanese and Korean",
      freeformField: "spec §09 control: mic + growing field + cream send, all three visible at rest",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: async (page) => {
      await gotoReturning(page);
      await page.getByRole("button", { name: "Talk to the chef" }).click();
      await page.getByText("Tell me what's changed.").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "you-field-editor",
    briefRef: "You — direct household composer (feature #2, no conversation needed)",
    // ⚠️ STALE SINCE S50, and it was being carried forward as B7's problem.
    // This asserted "How many you're cooking for", a string that has not existed
    // in `src/` since A3 (BUG-011) replaced the single stepper with the shared
    // `HouseholdComposer` and retitled the sheet. So the state has failed its
    // pre-shot check for three sessions and the You tab's direct-edit surface
    // has gone ungraded that whole time — BUG-030's class (a stale capture
    // selector fails silently where a spec would fail loudly).
    readyText: "Who I'm cooking for",
    facts: {
      // Also corrected: this said ONE stepper. A3 made it three bands, because
      // a bare count cannot say which band changed.
      composer: "adults / children / babies band steppers with a Save button",
      servingsLine:
        "'I'll cook for N servings' — says the count out loud because a 6-to-12m baby deliberately does NOT move it",
      directEdit: "a typed field is fixable directly, without Talk-to-Chef",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: async (page) => {
      await gotoReturning(page);
      await page.getByRole("button", { name: "Cooking for 2 adults" }).click();
      await page.getByText("Who I'm cooking for").waitFor({ timeout: 8_000 });
    },
  },
];
