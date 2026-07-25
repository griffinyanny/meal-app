"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useFreeTextCapture } from "./use-onboarding-talk";
import { useCoreSaves } from "./use-onboarding-saves";
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
  // Answers whose save didn't land. Non-empty means the reflect screen must not
  // claim everything is saved (BUG-016).
  unsaved: string[];
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
  submitFreeText: (text: string, dimension: Dimension) => Promise<boolean>;
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

  const finishMutation = trpc.user.finishOnboarding.useMutation();
  const skipMutation = trpc.user.skipOnboarding.useMutation();

  const showToast = useCallback((message: string) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Core answers persist turn-by-turn; a failure is named, remembered, and
  // retried before the interview closes rather than lost (BUG-016).
  const { persist, retryFailed, failedSaves, isRetrying } = useCoreSaves(showToast);

  // Free text goes through the SAME capture path the You tab uses — the
  // interview is a guided front-end over user.talk, not a second AI pipeline.
  const { submitFreeText, talkPending } = useFreeTextCapture({
    setState,
    setCaught,
    showToast,
  });

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
      persist("who I'm cooking for", { householdComposition: composition });
      setCaught([]);
      setStep("diet");
    },
    [persist]
  );

  const confirmDiet = useCallback(
    (framework: string) => {
      setState((s) => ({ ...s, dietaryFramework: framework }));
      persist("how you eat", {
        dietaryFramework: framework as "omnivore",
      });
      setCaught([]);
      setStep("restrictions");
    },
    [persist]
  );

  const confirmRestrictions = useCallback(
    (restrictions: string[]) => {
      setState((s) => ({ ...s, restrictions }));
      persist("what I should never cook with", { restrictions });
      setCaught([]);
      setStep("weeknight");
    },
    [persist]
  );

  const confirmWeeknight = useCallback(
    (minutes: number) => {
      setState((s) => ({ ...s, maxCookTimeWeeknight: minutes }));
      persist("your weeknight time", { maxCookTimeWeeknight: minutes });
      setCaught([]);
      setStep("deepenOffer");
    },
    [persist]
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
        persist("the cuisines you lean on", { cuisinePreferences: values });
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
    [advanceDeep, persist, state]
  );

  const finish = useCallback(async () => {
    // Last chance to land anything that failed mid-interview. Doing it here (not
    // at the failing turn) means a transient drop usually heals on its own, and
    // the user only ever sees one retry — the button they were going to press
    // anyway.
    if (!(await retryFailed())) {
      showToast("Still can't reach the kitchen. Check your connection and tap again.");
      return;
    }

    // The seed is what makes the first plan demonstrably reflect the interview.
    writeHandoff({ request: planSeedRequest(state) });
    try {
      await finishMutation.mutateAsync({ state });
    } catch {
      // Deliberately does NOT leave for Plan. finishOnboarding is what writes
      // every synthesized memory AND the completed flag, so on failure nothing
      // was saved and the gate will send the user straight back here — walking
      // them out to a plan built on nothing would be the same silence BUG-016
      // is about. Staying put keeps the retry one tap away.
      showToast("I couldn't save what you told me. Tap again and I'll retry.");
      return;
    }
    leaveToPlan();
  }, [finishMutation, leaveToPlan, retryFailed, showToast, state]);

  const skipAll = useCallback(() => {
    // Skip is first-class: no preferences, no memories, but the same
    // complete-flag, so the interview never re-prompts.
    skipMutation.mutate(undefined, {
      onSuccess: leaveToPlan,
      onError: leaveToPlan,
    });
  }, [leaveToPlan, skipMutation]);

  const isSaving =
    finishMutation.isPending || skipMutation.isPending || isRetrying;
  const unsaved = useMemo(
    () => failedSaves.map((f) => f.label),
    [failedSaves]
  );

  return useMemo(
    () => ({
      step,
      state,
      deepQuestion,
      isSaving,
      talkPending,
      unsaved,
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
      talkPending,
      toast,
      unsaved,
    ]
  );
}

export { CORE_ORDER, DEFAULT_HOUSEHOLD_COMPOSITION };
