// Turning a finished interview into what gets persisted (Phase 1E, feature #4).
//
// Deliberately deterministic, no model call. The interview's answers are already
// typed — a model would only be re-describing data we hold exactly, and it would
// add latency, cost, and a failure mode to the last step of a first run. The AI
// path exists where it's actually needed: free text the user typed, which
// user.talk already handles.
//
// These sentences are read back by the user in the You tab's memory ledger under
// "You told me when we started", so they're written in the chef's voice.
import {
  describeHousehold,
  type HouseholdComposition,
} from "@/lib/household";
import { isLowSignal } from "./planner";
import type { InterviewState } from "./types";

export interface SynthesizedMemory {
  content: string;
  category: "preference" | "brand" | "feedback" | "behavior" | "restriction";
}

const DIET_LABEL: Record<string, string> = {
  omnivore: "eats everything",
  vegetarian: "vegetarian",
  vegan: "vegan",
  pescatarian: "pescatarian",
  keto: "keto",
  paleo: "paleo",
  mediterranean: "Mediterranean",
  other: "following their own approach",
};

// The one memory that always gets written, even when the user only tapped and
// even when they skipped every optional turn. The brief's requirement: a
// completed interview ALWAYS leaves at least one sourceType:'onboarding' memory,
// so the You tab can honestly say "you told me when we started".
export function synthesizeHeadlineMemory(state: InterviewState): string {
  const parts: string[] = [];

  if (state.composition) {
    parts.push(`Cooking for ${householdPhrase(state.composition)}`);
  }

  if (state.dietaryFramework && state.dietaryFramework !== "omnivore") {
    parts.push(DIET_LABEL[state.dietaryFramework] ?? state.dietaryFramework);
  }

  if (state.maxCookTimeWeeknight) {
    parts.push(`keeps weeknights under ${state.maxCookTimeWeeknight} minutes`);
  }

  // A skip-everything run still earns an honest memory rather than a fabricated
  // one. It's what the chef actually knows: nothing yet.
  if (parts.length === 0) {
    return "Skipped the intro questions — start with something safe and simple and learn as we cook.";
  }

  return `${parts.join("; ")}.`;
}

function householdPhrase(c: HouseholdComposition): string {
  const roster = describeHousehold(c);
  if (roster) return roster;
  return c.adults === 1 ? "1 adult" : `${c.adults} adults`;
}

// Every memory a finished interview writes: the headline, then one per deep
// answer that actually carried signal. All stamped sourceType:'onboarding' by
// the caller.
export function synthesizeMemories(state: InterviewState): SynthesizedMemory[] {
  const memories: SynthesizedMemory[] = [
    { content: synthesizeHeadlineMemory(state), category: "preference" },
  ];

  for (const answer of state.deepAnswers) {
    if (isLowSignal(answer) || !answer.memory) continue;
    memories.push({
      content: answer.memory,
      // Shopping cadence is something they DO; the rest is what they like.
      category: answer.dimension === "shopping" ? "behavior" : "preference",
    });
  }

  return memories;
}

// The chef's opinionated read-back on the reflect screen. The brief asks for an
// actual cook's reaction ("I'm already picturing blistered shishitos"), not a
// receipt — so this leads with a dish the answers point at.
//
// Ordered most-specific first, and the CORE-ONLY answers (diet, weeknight time,
// who's at the table) each earn a real line of their own. Someone who taps the
// four core questions and declines the deep round is the most common completion
// there is; falling through to a generic "I've got enough" would mean the one
// moment the whole flow builds toward never fires for most people.
//
// `mentions` is the honesty guard: a line naming a food is only usable if the
// user hasn't just told us never to cook it. Naming salmon back to someone who
// declared a fish allergy on the previous screen would undo the entire safety
// turn, so a colliding candidate is skipped rather than shown.
interface HookCandidate {
  applies: (state: InterviewState) => boolean;
  mentions?: string[];
  line: string;
}

const HOOKS: HookCandidate[] = [
  {
    applies: (s) =>
      valueOf(s, "heat") === "hot" &&
      (valuesOf(s, "proteins").includes("fish") || s.dietaryFramework === "pescatarian"),
    mentions: ["shishito", "pepper", "chili", "salmon", "fish", "seafood"],
    line: "I'm already picturing blistered shishitos and a chili-crisp salmon.",
  },
  {
    applies: (s) => valueOf(s, "heat") === "hot",
    mentions: ["chili"],
    line: "Good. I'll actually season things, and there'll be chili crisp on the table.",
  },
  {
    applies: (s) => s.dietaryFramework === "vegan" || s.dietaryFramework === "vegetarian",
    mentions: ["broccoli"],
    line: "I'm thinking charred broccoli with something rich under it, not sad substitutes.",
  },
  {
    applies: (s) =>
      s.cuisinePreferences.some((c) => {
        const lower = c.toLowerCase();
        return lower.includes("thai") || lower.includes("indian");
      }),
    line: "I'm already thinking about the aromatics I want in your pantry.",
  },
  {
    // Ahead of the diet lines on purpose: a 20-minute ceiling is the sharper
    // constraint, and it's the one the cook has to answer first.
    applies: (s) => !!s.maxCookTimeWeeknight && s.maxCookTimeWeeknight <= 20,
    line: "Twenty minutes is a real constraint, so I'll cook hot and fast and lean on the pantry.",
  },
  {
    applies: (s) => s.dietaryFramework === "pescatarian",
    mentions: ["fish", "seafood", "salmon", "green bean"],
    line: "Fish is the fastest good dinner there is. I'm already picturing seared salmon with green beans that get some real char.",
  },
  {
    applies: (s) => !!s.composition && s.composition.babies > 0,
    line: "I'll build dinners that come apart easily, so the little one eats a version of what you eat.",
  },
  {
    applies: (s) => !!s.composition && s.composition.children > 0,
    line: "I'll cook things that survive being picked apart, and you won't be making two dinners.",
  },
  {
    applies: (s) => !!s.maxCookTimeWeeknight && s.maxCookTimeWeeknight <= 30,
    mentions: ["pork", "chop", "cabbage"],
    line: "Half an hour is plenty. I'm thinking a pork chop in a hot pan and cabbage that goes sweet at the edges.",
  },
  {
    applies: (s) => !!s.maxCookTimeWeeknight && s.maxCookTimeWeeknight >= 75,
    mentions: ["short rib", "beef", "braise"],
    line: "You've given yourself real time on a weeknight, so I'm putting a short-rib braise on the list.",
  },
  {
    applies: (s) => valuesOf(s, "proteins").length > 0,
    line: "I've got a few ideas I want to try on you this week.",
  },
];

export function reflectHook(state: InterviewState): string {
  const avoided = state.restrictions.map((r) =>
    r.replace(/\s*\(allergy\)\s*$/i, "").trim().toLowerCase()
  );
  const collides = (mentions?: string[]) =>
    !!mentions?.some((m) => avoided.some((a) => a.length > 0 && m.includes(a)));

  for (const hook of HOOKS) {
    if (hook.applies(state) && !collides(hook.mentions)) return hook.line;
  }
  return "I've got enough to build you a week worth cooking.";
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

function valueOf(state: InterviewState, questionId: string): string | null {
  const a = state.deepAnswers.find((x) => x.questionId === questionId);
  return a?.values[0] ?? null;
}

function valuesOf(state: InterviewState, questionId: string): string[] {
  return state.deepAnswers.find((x) => x.questionId === questionId)?.values ?? [];
}

// The plain summary under the hook — what the chef will actually cook around.
// Mirrors the You tab's narrative card so the two surfaces read as one voice.
export function reflectSummary(state: InterviewState): string {
  const bits: string[] = [];

  if (state.composition) bits.push(`Cooking for ${householdPhrase(state.composition)}`);
  if (state.dietaryFramework && state.dietaryFramework !== "omnivore") {
    bits.push(DIET_LABEL[state.dietaryFramework] ?? state.dietaryFramework);
  }
  if (state.maxCookTimeWeeknight) bits.push(`${state.maxCookTimeWeeknight} minutes on a weeknight`);
  if (state.cuisinePreferences.length > 0) {
    bits.push(`leaning ${state.cuisinePreferences.slice(0, 3).join(", ")}`);
  }

  if (bits.length === 0) {
    return "I'll start with something safe and simple, and learn as we cook.";
  }
  // Commas, not full stops: the diet labels are lowercase sentence fragments
  // ("pescatarian"), so period-joining them produced "Cooking for 2 adults.
  // pescatarian." — which reads like machine output on the one screen that has
  // to sound like a person.
  return `${bits.join(", ")}.`;
}

// The shape both callers have: the in-memory interview state, and the
// user_preferences row the Plan tab reads back after the hand-off.
export interface SeedChipSource {
  dietaryFramework?: string | null;
  maxCookTimeWeeknight?: number | null;
  cuisinePreferences?: string[] | null;
  restrictions?: string[] | null;
  composition?: HouseholdComposition | null;
}

// The seed chips shown on the pre-filled plan intent hand-off — the visible
// proof that the interview fed the plan. The Plan tab builds these from the
// PERSISTED preferences rather than anything carried across the navigation, so
// what the user sees is what the chef will actually cook with.
export function seedChips(source: SeedChipSource): string[] {
  const chips: string[] = [];
  const diet = source.dietaryFramework;
  // Chips are labels, not sentence fragments, so the diet gets a capital to sit
  // level with "Under 30 min" and "No shellfish" beside it.
  if (diet && diet !== "omnivore") chips.push(capitalize(DIET_LABEL[diet] ?? diet));
  if (source.maxCookTimeWeeknight) chips.push(`Under ${source.maxCookTimeWeeknight} min`);
  for (const cuisine of (source.cuisinePreferences ?? []).slice(0, 2)) chips.push(cuisine);
  if (source.composition && source.composition.children > 0) chips.push("Kid-friendly");
  for (const r of (source.restrictions ?? []).slice(0, 2)) {
    chips.push(`No ${r.replace(/\s*\(allergy\)\s*$/i, "").trim()}`);
  }
  return chips.slice(0, 6);
}

export function planSeedChips(state: InterviewState): string[] {
  return seedChips(state);
}

// The free-text request the hand-off pre-fills into plan generation, so the
// first plan demonstrably reflects the interview.
export function planSeedRequest(state: InterviewState): string | undefined {
  const parts: string[] = [];
  if (state.cuisinePreferences.length > 0) {
    parts.push(`leaning toward ${state.cuisinePreferences.slice(0, 3).join(", ")}`);
  }
  const proteins = valuesOf(state, "proteins");
  if (proteins.length > 0) parts.push(`featuring ${proteins.join(", ")}`);
  const heat = valueOf(state, "heat");
  if (heat === "hot") parts.push("with real heat");
  if (heat === "mild") parts.push("kept mild");
  const effort = valueOf(state, "effort");
  if (effort === "simple") parts.push("keeping the cooking simple");
  if (effort === "project") parts.push("with room for one ambitious night");
  const goals = valuesOf(state, "goal").filter((g) => g !== "nothing");
  if (goals.includes("more_veg")) parts.push("vegetable-forward");
  if (goals.includes("more_protein")) parts.push("protein-heavy");
  if (goals.includes("lighter")) parts.push("on the lighter side");
  if (goals.includes("budget")) parts.push("keeping costs down");

  if (parts.length === 0) return undefined;
  return `My first week: ${parts.join(", ")}.`;
}
