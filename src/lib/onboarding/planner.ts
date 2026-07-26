// The adaptive deep-round planner and its stopping policy (Phase 1E, feature
// #4). Griffin's framing: "keep probing as far as someone will go, but don't
// exhaust them." That's two jobs — pick the next question worth asking, and
// know when to stop — and this module owns both.
//
// WHY DETERMINISTIC, NOT A MODEL CALL: onboarding is the most latency-sensitive
// moment in the product, and a model call between every screen would buy
// question-ordering at the cost of seconds of dead air on a first run. A scored
// bank picks well enough, runs instantly on the client, costs nothing, and is
// exactly reproducible — which is what makes the policy tunable against an eval
// (scripts/1e-onboarding-planner-eval.ts) instead of a vibe. If ordering later
// proves too rigid, an AI planner can replace pickNext() behind this same
// interface without touching the flow.
//
// The policy below is TUNED, not fixed by nature. Change the numbers, run the
// eval, read the persona table.
import { DEEP_QUESTIONS, memoryForAnswer } from "./questions";
import type { DeepAnswer, DeepQuestion, InterviewState } from "./types";

export interface StoppingPolicy {
  // Hard ceiling on deep questions, however well it's going. The backstop that
  // makes "adaptive" safe.
  maxQuestions: number;
  // Stop once the best remaining question scores below this. With fatigue
  // applied, this is what ends the round for an engaged user before the cap.
  minValue: number;
  // Per-question multiplicative decay on everything still unasked. Models the
  // real cost of one more screen: the fifth question is worth less than the
  // first even when its content is identical.
  fatigue: number;
  // Stop after this many consecutive low-signal turns (a skip, or an answer
  // carrying no information). Someone tapping past questions is telling you
  // they're done; the cap alone would make them say it three more times.
  lowSignalStop: number;
  // How many questions an engaged cook actually reaches, which is what the value
  // meter is measured against. It is NOT maxQuestions: the cap is a backstop set
  // deliberately above the natural stop, and dividing by it told the most
  // engaged user possible that they'd finished 80% of something. Kept honest by
  // an eval invariant rather than by a comment — the Engaged persona must reach
  // exactly this number, so the two can't drift apart silently.
  meterTarget: number;
}

// Tuned against scripts/1e-onboarding-planner-eval.ts. Re-run it after changing
// any of these and read the persona table.
//
// History: minValue was 0.42, which sat right on top of the tail questions'
// decayed values, so a cook whose diet suppressed one question (a vegan, no
// protein turn) got a SHORTER interview than an omnivore for no reason they'd
// recognize. 0.38 cleared that cluster and gave every engaged persona 4
// questions. S39 added `skill` to the bank and raised `goal` into reach (it
// carries the cost signal), which made 4 too few to hold what the bank now
// knows: 0.35 lands an engaged cook on 5 with real margin either side, the 6th
// candidate scoring ~0.30.
export const DEFAULT_STOPPING_POLICY: StoppingPolicy = {
  maxQuestions: 6,
  minValue: 0.35,
  fatigue: 0.82,
  lowSignalStop: 2,
  meterTarget: 5,
};

export type StopReason =
  | "cap_reached"
  | "low_value"
  | "disengaged"
  | "bank_exhausted";

export type PlannerResult =
  | { kind: "ask"; question: DeepQuestion; score: number }
  | { kind: "stop"; reason: StopReason };

// A turn is low-signal when the user skipped it or chose an option that says
// nothing ("nothing specific"). memoryForAnswer returning null is precisely
// that test, so the two can't drift apart.
export function isLowSignal(answer: DeepAnswer): boolean {
  return answer.memory === null;
}

function trailingLowSignal(answers: DeepAnswer[]): number {
  let n = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (!isLowSignal(answers[i])) break;
    n++;
  }
  return n;
}

// What a question is worth right now: its base value, zeroed if the dimension
// is already covered, decayed by how many questions the user has already sat
// through.
export function scoreQuestion(
  question: DeepQuestion,
  state: InterviewState,
  policy: StoppingPolicy = DEFAULT_STOPPING_POLICY
): number {
  const asked = state.deepAnswers.length;

  if (state.deepAnswers.some((a) => a.questionId === question.id)) return 0;
  // Covered in the user's own words already — asking again reads as not
  // listening, which is worse than not asking.
  if (state.freeTextDimensions.includes(question.dimension)) return 0;
  if (question.appliesTo && !question.appliesTo(state)) return 0;

  return question.value * Math.pow(policy.fatigue, asked);
}

// The next question to ask, or the reason we're done. Pure: same state in, same
// decision out.
export function planNextQuestion(
  state: InterviewState,
  policy: StoppingPolicy = DEFAULT_STOPPING_POLICY
): PlannerResult {
  if (state.deepAnswers.length >= policy.maxQuestions) {
    return { kind: "stop", reason: "cap_reached" };
  }

  if (trailingLowSignal(state.deepAnswers) >= policy.lowSignalStop) {
    return { kind: "stop", reason: "disengaged" };
  }

  let best: { question: DeepQuestion; score: number } | null = null;
  for (const question of DEEP_QUESTIONS) {
    const score = scoreQuestion(question, state, policy);
    if (score > 0 && (!best || score > best.score)) best = { question, score };
  }

  if (!best) return { kind: "stop", reason: "bank_exhausted" };
  if (best.score < policy.minValue) return { kind: "stop", reason: "low_value" };

  return { kind: "ask", question: best.question, score: best.score };
}

// Builds the answer record for a turn, including the memory sentence it becomes.
// Used by the flow when the user confirms (or skips) a deep question.
export function buildDeepAnswer(
  question: DeepQuestion,
  values: string[]
): DeepAnswer {
  return {
    questionId: question.id,
    dimension: question.dimension,
    values,
    memory: memoryForAnswer(question, values),
  };
}

// How full the "the more you tell me, the better your plans get" meter is. Runs
// on signal actually captured, not questions survived: a meter that fills for
// skipping would be a lie about how much the chef learned. Measured against
// meterTarget rather than the hard cap, so a cook who answers everything they
// are offered actually gets to the end of the bar.
export function valueMeterProgress(
  state: InterviewState,
  policy: StoppingPolicy = DEFAULT_STOPPING_POLICY
): number {
  const captured = state.deepAnswers.filter((a) => !isLowSignal(a)).length;
  return Math.min(1, captured / policy.meterTarget);
}
