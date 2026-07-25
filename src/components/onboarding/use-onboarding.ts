"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  type HouseholdComposition,
} from "@/lib/household";
import { buildDeepAnswer, planNextQuestion } from "@/lib/onboarding/planner";
import { planSeedRequest } from "@/lib/onboarding/synthesize";
import { writeHandoff } from "@/lib/onboarding/handoff";
import {
  emptyInterviewState,
  type DeepQuestion,
  type Dimension,
  type InterviewState,
} from "@/lib/onboarding/types";

// The interview's steps, in order. The four core turns are fixed — they're
// load-bearing for a safe, useful first plan — and everything after "deepenOffer"
// is chosen by the planner.
export type Step =
  | "intro"
  | "household"
  | "diet"
  | "restrictions"
  | "weeknight"
  | "deepenOffer"
  | "deep"
  | "reflect";

const CORE_ORDER: Step[] = ["household", "diet", "restrictions", "weeknight"];

export interface OnboardingController {
  step: Step;
  state: InterviewState;
  deepQuestion: DeepQuestion | null;
  isSaving: boolean;
  talkPending: boolean;
  caught: string[];
  toast: string | null;
  showToast: (message: string) => void;
  dismissToast: () => void;
  start: () => void;
  // Each core turn persists as it's confirmed, so abandoning halfway still
  // leaves the chef knowing what it was told.
  confirmHousehold: (composition: HouseholdComposition) => void;
  confirmDiet: (framework: string) => void;
  confirmRestrictions: (restrictions: string[]) => void;
  confirmWeeknight: (minutes: number) => void;
  // Passing on a core question. Deliberately writes NOTHING: an unanswered
  // question should leave the chef knowing it doesn't know, not holding a
  // default it will present back as something you said.
  skipCore: () => void;
  answerDeep: (question: DeepQuestion, values: string[]) => void;
  acceptDeepRound: () => void;
  declineDeepRound: () => void;
  submitFreeText: (text: string, dimension: Dimension) => void;
  finish: () => void;
  skipAll: () => void;
}

export function useOnboarding(): OnboardingController {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>("intro");
  const [state, setState] = useState<InterviewState>(emptyInterviewState);
  const [deepQuestion, setDeepQuestion] = useState<DeepQuestion | null>(null);
  const [caught, setCaught] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const savePreferences = trpc.user.updatePreferences.useMutation();
  const finishMutation = trpc.user.finishOnboarding.useMutation();
  const skipMutation = trpc.user.skipOnboarding.useMutation();

  // Free text goes through the SAME capture path the You tab uses — the
  // interview is a guided front-end over user.talk, not a second AI pipeline.
  // Stamped "onboarding" so what it remembers reads as "you told me when we
  // started" in the ledger.
  const talkMutation = trpc.user.talk.useMutation();

  const showToast = useCallback((message: string) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Leaving the interview always lands on the Plan tab, never a dead end.
  const leaveToPlan = useCallback(() => {
    utils.user.preferences.invalidate();
    utils.user.memories.invalidate();
    router.replace("/plan");
  }, [router, utils]);

  const advanceDeep = useCallback((next: InterviewState) => {
    const result = planNextQuestion(next);
    if (result.kind === "ask") {
      setDeepQuestion(result.question);
      setStep("deep");
    } else {
      setDeepQuestion(null);
      setStep("reflect");
    }
  }, []);

  const start = useCallback(() => setStep("household"), []);

  const confirmHousehold = useCallback(
    (composition: HouseholdComposition) => {
      setState((s) => ({ ...s, composition }));
      // householdSize is derived server-side from the composition.
      savePreferences.mutate({ householdComposition: composition });
      setCaught([]);
      setStep("diet");
    },
    [savePreferences]
  );

  const confirmDiet = useCallback(
    (framework: string) => {
      setState((s) => ({ ...s, dietaryFramework: framework }));
      savePreferences.mutate({
        dietaryFramework: framework as "omnivore",
      });
      setCaught([]);
      setStep("restrictions");
    },
    [savePreferences]
  );

  const confirmRestrictions = useCallback(
    (restrictions: string[]) => {
      setState((s) => ({ ...s, restrictions }));
      savePreferences.mutate({ restrictions });
      setCaught([]);
      setStep("weeknight");
    },
    [savePreferences]
  );

  const confirmWeeknight = useCallback(
    (minutes: number) => {
      setState((s) => ({ ...s, maxCookTimeWeeknight: minutes }));
      savePreferences.mutate({ maxCookTimeWeeknight: minutes });
      setCaught([]);
      setStep("deepenOffer");
    },
    [savePreferences]
  );

  // Advance past the current core question without persisting anything. The
  // chef falls back to its schema defaults, which is honest: it doesn't know.
  const skipCore = useCallback(() => {
    setCaught([]);
    setStep((current) => {
      const i = CORE_ORDER.indexOf(current);
      if (i === -1 || i === CORE_ORDER.length - 1) return "deepenOffer";
      return CORE_ORDER[i + 1];
    });
  }, []);

  const acceptDeepRound = useCallback(() => {
    setCaught([]);
    advanceDeep(state);
  }, [advanceDeep, state]);

  const declineDeepRound = useCallback(() => setStep("reflect"), []);

  const answerDeep = useCallback(
    (question: DeepQuestion, values: string[]) => {
      const answer = buildDeepAnswer(question, values);
      // The cuisines turn fills a TYPED preference, not just a memory, so it
      // persists like a core answer and the You tab can edit it directly.
      if (question.dimension === "cuisines" && values.length > 0) {
        savePreferences.mutate({ cuisinePreferences: values });
      }
      // Computed outside the updater: advanceDeep is a side effect, and a
      // setState updater must stay pure (StrictMode invokes it twice).
      const next: InterviewState = {
        ...state,
        cuisinePreferences:
          question.dimension === "cuisines" && values.length > 0
            ? values
            : state.cuisinePreferences,
        deepAnswers: [...state.deepAnswers, answer],
      };
      setState(next);
      setCaught([]);
      advanceDeep(next);
    },
    [advanceDeep, savePreferences, state]
  );

  const submitFreeText = useCallback(
    (text: string, dimension: Dimension) => {
      talkMutation.mutate(
        { request: text, sourceType: "onboarding" },
        {
          onSuccess: async (data) => {
            // The tray shows the chef's own one-line read of what it caught.
            // user.talk has already applied the ops, so this is a confirmation,
            // not a pending edit.
            setCaught([data.reply]);

            // user.talk wrote straight to user_preferences, so the server now
            // knows things this component doesn't. Pull them back before moving
            // on: without this, answering "we're pescatarian" by TYPING would
            // leave the reflect screen, the synthesized memory, and the planner
            // all blind to it — the interview would forget what it just heard.
            const prefs = await utils.user.preferences.fetch();

            setState((s) => ({
              ...s,
              dietaryFramework: prefs?.dietaryFramework ?? s.dietaryFramework,
              restrictions: (prefs?.restrictions as string[] | null) ?? s.restrictions,
              cuisinePreferences:
                (prefs?.cuisinePreferences as string[] | null) ?? s.cuisinePreferences,
              maxCookTimeWeeknight:
                prefs?.maxCookTimeWeeknight ?? s.maxCookTimeWeeknight,
              composition:
                (prefs?.householdComposition as HouseholdComposition | null) ??
                s.composition,
              freeTextDimensions: s.freeTextDimensions.includes(dimension)
                ? s.freeTextDimensions
                : [...s.freeTextDimensions, dimension],
            }));
          },
          onError: () =>
            showToast("The chef didn't catch that. Try again, or just tap an answer."),
        }
      );
    },
    [showToast, talkMutation, utils]
  );

  const finish = useCallback(() => {
    // The seed is what makes the first plan demonstrably reflect the interview.
    writeHandoff({ request: planSeedRequest(state) });
    finishMutation.mutate(
      { state },
      { onSuccess: leaveToPlan, onError: leaveToPlan }
    );
  }, [finishMutation, leaveToPlan, state]);

  const skipAll = useCallback(() => {
    // Skip is first-class: no preferences, no memories, but the same
    // complete-flag, so the interview never re-prompts.
    skipMutation.mutate(undefined, {
      onSuccess: leaveToPlan,
      onError: leaveToPlan,
    });
  }, [leaveToPlan, skipMutation]);

  const isSaving = finishMutation.isPending || skipMutation.isPending;

  return useMemo(
    () => ({
      step,
      state,
      deepQuestion,
      isSaving,
      talkPending: talkMutation.isPending,
      caught,
      toast,
      showToast,
      dismissToast,
      start,
      confirmHousehold,
      confirmDiet,
      confirmRestrictions,
      confirmWeeknight,
      skipCore,
      answerDeep,
      acceptDeepRound,
      declineDeepRound,
      submitFreeText,
      finish,
      skipAll,
    }),
    [
      acceptDeepRound,
      answerDeep,
      caught,
      confirmDiet,
      confirmHousehold,
      confirmRestrictions,
      confirmWeeknight,
      declineDeepRound,
      deepQuestion,
      dismissToast,
      finish,
      isSaving,
      showToast,
      skipAll,
      skipCore,
      start,
      state,
      step,
      submitFreeText,
      talkMutation.isPending,
      toast,
    ]
  );
}

export { CORE_ORDER, DEFAULT_HOUSEHOLD_COMPOSITION };
