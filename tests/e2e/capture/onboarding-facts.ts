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
      stageProposed:
        "'6 to 12 months' is ALREADY selected — this is the first frame after tapping +, with nothing else tapped. The note narrates that assumption, so the chips read as a correction rather than a second, blank question ('AI proposes, user reacts')",
      servingsExplained:
        "'I'll cook for 2 servings, plus bites for the little one.' — the count deliberately doesn't move for a 6-to-12-month-old, and says why, so an unchanged number doesn't read as a tap that failed to register",
      noShift:
        "the steppers above have NOT moved from ob-household; the note grows downward into the slack",
      tasteQuestion: "does this read as one extra tap, or as a form growing under you?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoHousehold(page);
      await page.getByRole("button", { name: "One more babies under 2" }).click();
      await expect(page.getByTestId("onboarding-baby-stage")).toBeVisible();
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
    id: "ob-safety-selected",
    briefRef: "Onboarding — a CHOSEN allergen carries the You tab's red weight, not the blue accent",
    readyText: "Anything I should never cook with?",
    facts: {
      redSelection:
        "Shellfish selected and rendered red, distinct from every unselected chip AND from a selected diet chip",
      whyItMatters:
        "the next screen recaps these same items in red; a blue allergen would lose the one distinction this screen exists to make",
      confirm: "'That's everything' appears once something is selected",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoRestrictions(page);
      await page.getByTestId("onboarding-option-shellfish").click();
      await expect(page.getByTestId("onboarding-confirm")).toBeVisible();
    },
  },
  {
    id: "ob-diet-typed-pill",
    briefRef: "Onboarding — free text lights the matching pill (the tray stays silent about it)",
    readyText: "How do you eat?",
    facts: {
      litPill: "Vegan selected, by typing alone — no tap happened",
      noTray:
        "the 'what I caught' tray is ABSENT: the pill already says it, and the locked design forbids restating it",
      confirm: "the confirm appears, so a typed answer is a complete path",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDiet(page);
      await page.getByTestId("onboarding-tell-me-input").fill("we are going vegan");
      await page.getByTestId("onboarding-tell-me-send").click();
      await expect(page.getByTestId("onboarding-option-vegan")).toHaveAttribute(
        "aria-pressed",
        "true",
        { timeout: 20_000 }
      );
    },
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
      eyebrow: "'THAT'S THE ESSENTIALS' beside the ember chef mark — the chef is visibly present on the one screen where it asks for more of your time",
      honestBothWays: "copy says the plan is good now AND that more makes it better, in two lines",
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
    briefRef:
      "Reflect playback — STATE 1, core only (design/surfaces/onboarding/brief-reflect-playback.md)",
    readyText: "SO HERE'S YOUR WEEK",
    facts: {
      eyebrow: "'HERE'S WHAT I'M THINKING'",
      hook: "the opinion leads, alone on the floor, with nothing boxed around it",
      playback:
        "'WHAT I'VE GOT' glass card, grouped AT THE TABLE / HOW YOU EAT / THE CLOCK — kitchen logic, not schema order; every fact a sentence, never a label/value pair",
      emptyGroups:
        "IN THE KITCHEN is ABSENT (no skill/effort answered) — a group with nothing in it is dropped, never shown empty",
      safetyRecap:
        "red 'I'll never cook with' card recapping Shellfish with the 'allergy' sub-label — its own object, never sharing a card, positioned AFTER the playback (Griffin, S39)",
      week:
        "'SO HERE'S YOUR WEEK' — three decisions in gold voice, closing on the shellfish promise",
      editPath: "'All saved. Change any of it anytime in You.' at the end of the scroll, not in the bar",
      cta: "'Plan my first week' on a chrome bar pinned to the bottom edge",
      tasteQuestion: "does the core-only state feel thin, or complete?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDeepenOffer(page);
      await page.getByTestId("onboarding-deepen-no").click();
      await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();
    },
  },
  {
    // The state that has to prove going deeper was worth the taps. Captured
    // separately because the design's central claim — depth reads as
    // specificity, not as a longer list — is only checkable by looking at this
    // one next to the one above it.
    id: "ob-reflect-deep",
    briefRef: "Reflect playback — STATE 2, fully engaged",
    readyText: "SO HERE'S YOUR WEEK",
    facts: {
      richness:
        "visibly richer than ob-reflect at the SAME structure: more facts inside the same groups, more decisions in the week list. No new sections, no second tier, no count anywhere",
      kitchenGroup: "'IN THE KITCHEN' now present, fed by the skill answer",
      week: "the week list has gained decisions that trace to the deep answers (heat -> a pantry decision)",
      noMeter: "no progress meter and no 'x of y' on this screen — depth is never a count",
      tasteQuestion: "does answering five more questions visibly buy something?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoDeepenOffer(page);
      await page.getByTestId("onboarding-deepen-yes").click();
      // Walk the adaptive round to its natural end, answering each turn with
      // its first real option, the way an engaged cook would.
      for (let i = 0; i < 6; i++) {
        const confirm = page.getByTestId("onboarding-confirm");
        const options = page.locator('[data-testid^="onboarding-option-"]');
        if ((await options.count()) === 0) break;
        await options.first().click();
        await confirm.click();
        if (await page.getByTestId("onboarding-reflect-hook").isVisible()) break;
      }
      await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();
    },
  },
  {
    // Household answered, everything else passed. The state that must not read
    // as a punishment for skipping.
    id: "ob-reflect-sparse",
    briefRef: "Reflect playback — STATE 3, skipped almost everything",
    readyText: "SO HERE'S YOUR WEEK",
    facts: {
      guesses:
        "'WHAT I'M GUESSING, UNTIL YOU SAY OTHERWISE' names the assumptions in plain warm grey",
      noBorrowedRed:
        "the guesses block does NOT use the safety treatment — a gap is not a warning, and there is no red card at all here since no allergies were given",
      week: "a week is still described, because the heading promises one",
      tone: "the chef sounds like it's looking forward to cooking, not like it's short of data",
      tasteQuestion: "does skipping feel respected, or punished?",
    },
    prepare: firstRun,
    navigate: async (page) => {
      await gotoHousehold(page);
      await page.getByTestId("onboarding-confirm-household").click();
      await expect(page.getByText("How do you eat?")).toBeVisible();
      await page.getByTestId("onboarding-skip-question").click();
      await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
      await page.getByTestId("onboarding-pass").click();
      await expect(page.getByText("How much time on a weeknight?")).toBeVisible();
      await page.getByTestId("onboarding-skip-question").click();
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
