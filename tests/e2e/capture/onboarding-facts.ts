// App-specific (meal-app): the onboarding-interview capture states + ground-truth
// facts for the Layer-A visual QA of Phase 1E #4. Like You, this surface
// publishes no debug-HUD section, so states gate on readyText + facts.
//
// Every state reseeds the first-run condition and walks the real flow forward
// from /welcome — there is no way to deep-link a turn, and driving it for real
// is the point: a screen that can only be reached by a walk the user can't do
// isn't the screen the user sees. Copy strings are verified against the
// components (intro-screen, household-screen, question-screen, deepen-offer,
// reflect-screen) and the locked brief at design/surfaces/onboarding/brief.md.
import { expect, type Page } from "@playwright/test";
import { seedOnboardingState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

// No HUD section on this surface; a nominal key for the manifest meta.
export const ONBOARDING_SECTION_KEY = "onboarding";

const firstRun = () => seedOnboardingState("ONBOARDING_NEW");

async function gotoIntro(page: Page): Promise<void> {
  await page.goto("/welcome");
  await page
    .getByText("Let's get to know each other.")
    .waitFor({ timeout: 15_000 });
}

async function gotoHousehold(page: Page): Promise<void> {
  await gotoIntro(page);
  await page.getByTestId("onboarding-start").click();
  await expect(page.getByText("Who am I cooking for?")).toBeVisible();
}

async function gotoDiet(page: Page): Promise<void> {
  await gotoHousehold(page);
  await page.getByTestId("onboarding-confirm-household").click();
  await expect(page.getByText("How do you eat?")).toBeVisible();
}

async function gotoRestrictions(page: Page): Promise<void> {
  await gotoDiet(page);
  await page.getByTestId("onboarding-option-pescatarian").click();
  await page.getByTestId("onboarding-confirm").click();
  await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
}

async function gotoWeeknight(page: Page): Promise<void> {
  await gotoRestrictions(page);
  await page.getByTestId("onboarding-option-shellfish").click();
  await page.getByTestId("onboarding-confirm").click();
  await expect(page.getByText("How much time on a weeknight?")).toBeVisible();
}

async function gotoDeepenOffer(page: Page): Promise<void> {
  await gotoWeeknight(page);
  await page.getByTestId("onboarding-option-30").click();
  await page.getByTestId("onboarding-confirm").click();
  await expect(page.getByText("Want to go a little deeper?")).toBeVisible();
}

export const ONBOARDING_CAPTURE_STATES: CaptureStateDef[] = [
  {
    id: "ob-intro",
    briefRef: "Onboarding Interview.dc.html — state 1, intro (ember chef presence)",
    readyText: "Let's get to know each other.",
    facts: {
      chefPresence: "ember/steam chef mark above a 'YOUR CHEF' eyebrow",
      appExplainer:
        "three points: I propose you react / tell me in plain words / I remember it, change it in You",
      primaryCta: "'Let's get started'",
      skipFirstClass: "'Skip for now, use sensible defaults' as its own full-width control",
      noTabBar: "the interview is a conversation, not a destination — no bottom nav",
    },
    prepare: firstRun,
    navigate: gotoIntro,
  },
  {
    id: "ob-household",
    briefRef: "Onboarding — core turn 1, household composition (band steppers)",
    readyText: "Who am I cooking for?",
    facts: {
      threeBands:
        "one grouped card, hairline-divided: Adults (2) / Children 'Ages 2 to 12' (0) / Babies under 2 'First foods' (0)",
      noBabyNote: "the amber baby-stage note is ABSENT while babies = 0",
      tellMeField: "'or just tell me' row: mic button + 'Two of us and a 9 month old' placeholder",
      servingsLine: "'I'll cook for 2 servings.' under the confirm",
      skipQuestion: "'Skip this question' is present and quiet",
    },
    prepare: firstRun,
    navigate: gotoHousehold,
  },
  {
    id: "ob-household-baby",
    briefRef:
      "Onboarding — the S36 baby-stage follow-up (an addition to the locked design; Griffin's taste call)",
    readyText: "Who am I cooking for?",
    facts: {
      babyCount: "Babies under 2 stepper reads 1",
      babyNote:
        "amber note revealed: 'I'll flag first-foods textures and skip choking hazards for the little one.'",
      stageChips:
        "three stage chips inside that note — Under 6 months / 6 to 12 months / 12 to 24 months — with '6 to 12 months' selected",
      servingsUnchanged:
        "'I'll cook for 2 servings.' — a 6-to-12-month-old eats adapted bites, not a portion",
      tasteQuestion: "does this read as one extra tap, or as a form growing under you?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoHousehold(page);
      await page.getByRole("button", { name: "One more babies under 2" }).click();
      await expect(page.getByTestId("onboarding-baby-stage")).toBeVisible();
      await page.getByTestId("onboarding-baby-stage-6_to_12m").click();
    },
  },
  {
    id: "ob-diet",
    briefRef: "Onboarding — core turn 2, diet (the repeating chip unit)",
    readyText: "How do you eat?",
    facts: {
      status: "'HOW YOU EAT' chef-status eyebrow above the headline",
      chips:
        "8 wrapping chips: No restrictions / Pescatarian / Vegetarian / Vegan / Keto / Mediterranean / Paleo / Something else",
      noConfirmYet: "the blue confirm is absent until something is selected",
      tellMeField: "'We went pescatarian last year' placeholder",
    },
    prepare: firstRun,
    navigate: gotoDiet,
  },
  {
    id: "ob-diet-caught",
    briefRef:
      "Onboarding — the 'what I caught' tray after free text (brief: shows only what the pills don't cover)",
    readyText: "WHAT I CAUGHT",
    facts: {
      trayPresent: "amber 'WHAT I CAUGHT' tray between the chips and the tell-me field",
      trayContent:
        "the chef's one-line reply about adding Thai to cuisines (mock content — judge FORM, not phrasing)",
      briefDeviation:
        "the locked brief specifies extracted CHIPS (e.g. 'Thai'); the build renders the reply SENTENCE as one chip",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDiet(page);
      await page.getByTestId("onboarding-tell-me-input").fill("I love Thai food");
      await page.getByTestId("onboarding-tell-me-send").click();
      await expect(page.getByTestId("onboarding-caught-tray")).toBeVisible({
        timeout: 20_000,
      });
    },
  },
  {
    id: "ob-safety",
    briefRef: "Onboarding — core turn 3, THE SAFETY TURN (You-tab red weight, easy pass)",
    readyText: "Anything I should never cook with?",
    facts: {
      safetyWeight: "'THE SAFETY TURN' status carries the red/destructive weight",
      chips: "10 allergen chips: Peanuts … Pork",
      easyPass: "'Nothing comes to mind' is a first-class pass, not a buried link",
      noMedicalTone: "no intake-form or medical register",
    },
    prepare: firstRun,
    navigate: gotoRestrictions,
  },
  {
    id: "ob-weeknight",
    briefRef: "Onboarding — core turn 4, weeknight time (two-column cards)",
    readyText: "How much time on a weeknight?",
    facts: {
      cards:
        "2x2 cards with sub-lines: 20 minutes/In and out · 30 minutes/The usual · 45 minutes/Room to cook · An hour plus/I enjoy it",
      status: "'A WEEKNIGHT' eyebrow",
    },
    prepare: firstRun,
    navigate: gotoWeeknight,
  },
  {
    id: "ob-deepen-offer",
    briefRef: "Onboarding — state 4a, the opt-in gate for the adaptive deep round",
    readyText: "Want to go a little deeper?",
    facts: {
      eyebrow: "'THAT'S THE ESSENTIALS'",
      honestBothWays: "copy says the plan is good now AND that more makes it better",
      declineIsEqual:
        "'Just build my week' is a full-width button beside the accept, not a hidden link",
    },
    prepare: firstRun,
    navigate: gotoDeepenOffer,
  },
  {
    id: "ob-deep-question",
    briefRef: "Onboarding — state 4b, an adaptive deep turn (value meter + 'why we ask')",
    readyText: "How much heat do you actually want?",
    facts: {
      valueMeter:
        "'THE MORE YOU TELL ME, THE BETTER YOUR PLANS GET' + 'Optional' + a track that is legitimately EMPTY on the first deep question (it measures signal, not questions survived)",
      whyLine: "italic 'why we ask' line under the headline",
      exit: "'I'm good for now, build my week' present on the turn itself",
      status: "'GOING DEEPER' eyebrow",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDeepenOffer(page);
      await page.getByTestId("onboarding-deepen-yes").click();
      await expect(page.getByText("How much heat do you actually want?")).toBeVisible();
    },
  },
  {
    id: "ob-reflect",
    briefRef: "Onboarding — state 6, reflect (opinionated cook, not a receipt)",
    readyText: "All saved.",
    facts: {
      eyebrow: "'HERE'S WHAT I'M THINKING'",
      hook: "an opinionated dish-level hook leads, above the summary",
      safetyRecap:
        "red 'I'll never cook with' card recapping Shellfish with the 'allergy' sub-label — the You tab's exact vocabulary",
      editPath: "'All saved. Change any of it anytime in You.'",
      cta: "'Plan my first week'",
      tasteQuestion: "does the hook sound like a cook with a point of view, or a receipt?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDeepenOffer(page);
      await page.getByTestId("onboarding-deepen-no").click();
      await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();
    },
  },
  {
    id: "ob-handoff",
    briefRef:
      "Onboarding — state 7, the hand-off: the REAL Plan intent screen pre-seeded (door #3)",
    readyText: "YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME",
    facts: {
      notBespoke: "this is the existing Plan intent surface, pre-filled — not an onboarding screen",
      seedChips: "chips carry 'pescatarian' and 'Under 30 min' from the interview",
      cta: "'Build my first week'",
      knownDeviation:
        "the brief's dinners stepper + lunch/breakfast toggles are deliberately ABSENT (R1 generates dinners only; they would be dead controls)",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDeepenOffer(page);
      await page.getByTestId("onboarding-deepen-no").click();
      await page.getByTestId("onboarding-build-plan").click();
      await expect(page).toHaveURL(/\/plan$/);
    },
  },
  {
    id: "ob-mic-toast",
    briefRef: "Onboarding — the mic's honest 'not yet' (R1 is text-only; STT deferred)",
    readyText: "Voice is coming soon",
    facts: {
      toast: "'Voice is coming soon. For now, type it and I'll catch it.'",
      honest: "the mic answers rather than failing silently or pretending to listen",
      placement: "toast does not cover the answer controls it interrupts",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoHousehold(page);
      await page.getByRole("button", { name: "Answer by voice" }).click();
      await expect(page.getByTestId("onboarding-toast")).toBeVisible();
    },
  },
];
