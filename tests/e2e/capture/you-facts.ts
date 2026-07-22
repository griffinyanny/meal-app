// App-specific (meal-app): the You-tab capture states + ground-truth facts for the
// Layer-A visual QA. You publishes no debug-HUD section, so states gate on readyText
// + facts (the runtime handles a missing HUD gracefully). Copy strings are verified
// against the components. Some states drive a small interaction in navigate() (open
// the chef sheet, open a field editor) and wait for the resulting element first.
import { type Page } from "@playwright/test";
import { seedYouState } from "../app/seed";
import { type CaptureStateDef } from "./capture-runtime";

// No HUD section on this tab; a nominal key for the manifest meta.
export const YOU_SECTION_KEY = "you";

const gotoYou = (page: Page) => page.goto("/you").then(() => {});

async function gotoReturning(page: Page): Promise<void> {
  await page.goto("/you");
  await page.getByText("Here's what I know about you.").waitFor({ timeout: 15_000 });
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
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: gotoReturning,
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
      textarea: "free-text input + send",
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
    briefRef: "You — direct household stepper editor (feature #2, no conversation needed)",
    readyText: "How many you're cooking for",
    facts: {
      stepper: "− / value / + stepper with a Save button",
      directEdit: "a typed field is fixable directly, without Talk-to-Chef",
    },
    prepare: () => seedYouState("YOU_RETURNING"),
    navigate: async (page) => {
      await gotoReturning(page);
      await page.getByRole("button", { name: "Cooking for 2 adults" }).click();
      await page.getByText("How many you're cooking for").waitFor({ timeout: 8_000 });
    },
  },
];
