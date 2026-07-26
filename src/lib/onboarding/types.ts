// Shared types for the first-run onboarding interview (Phase 1E, feature #4).
// Pure — the interview UI (client), the planner, and the tRPC finish mutation
// (server) all import from here.
import type { HouseholdComposition } from "@/lib/household";

// The dimensions the interview can learn about a cook. The planner uses these
// to avoid asking about something it already knows — whether it was learned by
// tapping, by free text routed through user.talk, or in the core round.
export type Dimension =
  | "household"
  | "diet"
  | "restrictions"
  | "weeknight_time"
  | "heat"
  | "proteins"
  | "effort"
  | "skill"
  | "cuisines"
  | "leftovers"
  | "goal"
  | "shopping";

export type AnswerKind = "cards" | "chips" | "steppers";

export interface QuestionOption {
  value: string;
  label: string;
  // Rendered under the label on card-style options (the locked design's
  // two-column cards carry a sub-line; chips do not).
  sub?: string;
}

export interface DeepQuestion {
  id: string;
  dimension: Dimension;
  // The chef's question, verbatim on screen.
  headline: string;
  // The honest "why we ask" line the locked design shows in italics under the
  // headline. Never omitted on a deep question — it's what makes the round feel
  // like a chef working rather than a form collecting.
  why: string;
  kind: AnswerKind;
  multi: boolean;
  options: QuestionOption[];
  // How much this question is worth asking, before novelty and fatigue. Tuned
  // by hand and exercised by the planner eval.
  value: number;
  // Suppresses the question entirely when it can't apply (e.g. don't ask which
  // proteins to feature when the diet already rules out every animal protein).
  appliesTo?: (state: InterviewState) => boolean;
  // Narrows the options to the ones that still make sense for this cook.
  optionsFor?: (state: InterviewState) => QuestionOption[];
}

export interface DeepAnswer {
  questionId: string;
  dimension: Dimension;
  // The option values chosen. Empty = the user skipped or said "no preference"
  // — the planner reads that as a low-signal turn.
  values: string[];
  // Prebuilt memory sentence for this answer, or null when the answer carries
  // no information worth remembering.
  memory: string | null;
}

// Everything the interview knows at a given moment. Built up across the core
// round and carried into the deep round, where the planner reads it.
export interface InterviewState {
  composition: HouseholdComposition | null;
  dietaryFramework: string | null;
  restrictions: string[];
  maxCookTimeWeeknight: number | null;
  cuisinePreferences: string[];
  // Free-text the user typed during the interview. It has already been applied
  // to preferences/memories by user.talk; kept here so the planner can see that
  // a dimension was covered in the user's own words.
  freeTextDimensions: Dimension[];
  deepAnswers: DeepAnswer[];
}

export function emptyInterviewState(): InterviewState {
  return {
    composition: null,
    dietaryFramework: null,
    restrictions: [],
    maxCookTimeWeeknight: null,
    cuisinePreferences: [],
    freeTextDimensions: [],
    deepAnswers: [],
  };
}
