"use client";

import { useOnboarding } from "./use-onboarding";
import { IntroScreen } from "./intro-screen";
import { HouseholdScreen } from "./household-screen";
import { QuestionScreen } from "./question-screen";
import { DeepenOfferScreen } from "./deepen-offer-screen";
import { ReflectScreen } from "./reflect-screen";
import { OnboardingToast } from "./onboarding-toast";
import { valueMeterProgress } from "@/lib/onboarding/planner";
import { makeRestriction } from "@/components/you/constraint-utils";
import type { Dimension, InterviewState, QuestionOption } from "@/lib/onboarding/types";

// The three core turns that render through the shared question screen. Household
// has its own screen (three steppers plus the baby follow-up); these three are
// the plain tap-or-tell shape.
const DIET_OPTIONS: QuestionOption[] = [
  { value: "omnivore", label: "No restrictions" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
  { value: "other", label: "Something else" },
];

// Common allergens plus the everyday avoids, so the safety turn is one tap for
// most people. Anything not listed goes through the text field.
const RESTRICTION_OPTIONS: QuestionOption[] = [
  { value: "peanuts", label: "Peanuts" },
  { value: "tree nuts", label: "Tree nuts" },
  { value: "shellfish", label: "Shellfish" },
  { value: "fish", label: "Fish" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "gluten", label: "Gluten" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
  { value: "pork", label: "Pork" },
];

const WEEKNIGHT_OPTIONS: QuestionOption[] = [
  { value: "20", label: "20 minutes", sub: "In and out" },
  { value: "30", label: "30 minutes", sub: "The usual" },
  { value: "45", label: "45 minutes", sub: "Room to cook" },
  { value: "75", label: "An hour plus", sub: "I enjoy it" },
];

// What the chef already knows for a core turn, expressed as option values so
// the turn's own pills can show it. Populated only by free text — a tapped
// answer advances the flow, so it never comes back to a turn it already
// answered.
function preselectedFor(step: string, state: InterviewState): string[] {
  if (step === "diet") return state.dietaryFramework ? [state.dietaryFramework] : [];
  if (step === "restrictions") {
    return state.restrictions.map((r) =>
      r.replace(/\s*\(allergy\)\s*$/i, "").trim().toLowerCase()
    );
  }
  if (step === "weeknight") {
    return state.maxCookTimeWeeknight ? [String(state.maxCookTimeWeeknight)] : [];
  }
  return [];
}

export function OnboardingFlow() {
  const o = useOnboarding();

  const micToast = () =>
    o.showToast("Voice is coming soon. For now, type it and I'll catch it.");

  const freeText = (dimension: Dimension) => (text: string) =>
    o.submitFreeText(text, dimension);

  const shared = {
    onMicTap: micToast,
    talkPending: o.talkPending,
    caught: o.caught,
  };

  const corePreselect = (step: string) => ({
    preselected: preselectedFor(step, o.state),
  });

  function body() {
    switch (o.step) {
      case "intro":
        return (
          <IntroScreen
            onStart={o.start}
            onSkipAll={o.skipAll}
            isSaving={o.isSaving}
          />
        );

      case "household":
        return (
          <HouseholdScreen
            onConfirm={o.confirmHousehold}
            onSkip={o.skipCore}
            onFreeText={freeText("household")}
            {...shared}
          />
        );

      case "diet":
        return (
          <QuestionScreen
            questionId="diet"
            status="HOW YOU EAT"
            headline="How do you eat?"
            kind="chips"
            multi={false}
            options={DIET_OPTIONS}
            example="We went pescatarian last year"
            confirmLabel="That's how I eat"
            onConfirm={(values) => o.confirmDiet(values[0])}
            onFreeText={freeText("diet")}
            onSkipQuestion={o.skipCore}
            {...corePreselect("diet")}
            {...shared}
          />
        );

      case "restrictions":
        return (
          <QuestionScreen
            questionId="restrictions"
            status="THE SAFETY TURN"
            safety
            headline="Anything I should never cook with?"
            kind="chips"
            multi
            options={RESTRICTION_OPTIONS}
            example="I'm allergic to shellfish"
            confirmLabel="That's everything"
            // Every tapped item is treated as an allergy. On this screen that's
            // the safe reading: someone tapping "peanuts" under "never cook
            // with" is far more likely to mean an allergy than a mild dislike,
            // and over-protecting is the only acceptable error direction here.
            // Plain dislikes have their own home in the You tab.
            onConfirm={(values) =>
              o.confirmRestrictions(values.map((v) => makeRestriction(v, true)))
            }
            onFreeText={freeText("restrictions")}
            passLabel="Nothing comes to mind"
            onPass={() => o.confirmRestrictions([])}
            {...corePreselect("restrictions")}
            {...shared}
          />
        );

      case "weeknight":
        return (
          <QuestionScreen
            questionId="weeknight"
            status="A WEEKNIGHT"
            headline="How much time on a weeknight?"
            kind="cards"
            multi={false}
            options={WEEKNIGHT_OPTIONS}
            example="Thirty minutes, tops"
            confirmLabel="That's my weeknight"
            onConfirm={(values) => o.confirmWeeknight(Number(values[0]))}
            onFreeText={freeText("weeknight_time")}
            onSkipQuestion={o.skipCore}
            {...corePreselect("weeknight")}
            {...shared}
          />
        );

      case "deepenOffer":
        return (
          <DeepenOfferScreen
            onAccept={o.acceptDeepRound}
            onDecline={o.declineDeepRound}
          />
        );

      case "deep": {
        const q = o.deepQuestion;
        if (!q) return null;
        const options = q.optionsFor ? q.optionsFor(o.state) : q.options;
        return (
          <QuestionScreen
            questionId={q.id}
            status="GOING DEEPER"
            headline={q.headline}
            why={q.why}
            kind={q.kind}
            multi={q.multi}
            options={options}
            example="Tell me in your own words"
            confirmLabel="That's it"
            meter={valueMeterProgress(o.state)}
            onConfirm={(values) => o.answerDeep(q, values)}
            onFreeText={freeText(q.dimension)}
            onGoodForNow={o.declineDeepRound}
            onSkipQuestion={() => o.answerDeep(q, [])}
            {...shared}
          />
        );
      }

      case "reflect":
        return (
          <ReflectScreen
            state={o.state}
            onBuildPlan={o.finish}
            isSaving={o.isSaving}
            unsaved={o.unsaved}
          />
        );
    }
  }

  // Skip-to-app is first-class at every step, not buried — the anti-Cooklist
  // "let me see what I've got" call. It's absent only on the intro (which has
  // its own full-width skip) and the reflect turn (nothing left to skip).
  const showSkip = o.step !== "intro" && o.step !== "reflect";

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="flex h-[46px] flex-none items-center justify-end px-5">
        {showSkip && (
          <button
            type="button"
            onClick={o.skipAll}
            disabled={o.isSaving}
            data-testid="onboarding-skip-all"
            className="px-1 py-2 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-[26px] pb-8">{body()}</div>

      <OnboardingToast message={o.toast} onDismiss={o.dismissToast} />
    </div>
  );
}
