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
import { DEEP_QUESTIONS, memoryForAnswer } from "./questions";
import type { DeepAnswer, InterviewState } from "./types";

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
export function synthesizeHeadlineMemory(state: MemorySource): string {
  const parts: string[] = [];

  if (state.composition) {
    parts.push(`Cooking for ${householdPhrase(state.composition)}`);
  }

  // BUG-013 · the label table decides, and an unrecognised framework is DROPPED
  // rather than echoed. The old `?? state.dietaryFramework` put the caller's own
  // string into a sourceType:'onboarding' sentence, which is the same defect as
  // the deep-answer one through a quieter door. Omitting the clause is also the
  // honest outcome: a framework the chef has no label for is one it cannot cook
  // to either.
  const diet = state.dietaryFramework ? DIET_LABEL[state.dietaryFramework] : null;
  if (diet && state.dietaryFramework !== "omnivore") parts.push(diet);

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

// Exactly what the memory writes read from a finished interview, and nothing
// more. Deliberately NOT `InterviewState`: an answer contributes a question id
// and the options chosen, full stop. `memory` and `dimension` are the client's
// own derivations and are recomputed here, so naming them in this type would
// only invite trusting them again (BUG-013). `InterviewState` is assignable to
// it, so the client-side callers are unaffected.
//
// The old signature took `InterviewState` and the router reached it through an
// `as InterviewState` cast, which is what let a schema field typed `string`
// stand in for one typed as an enum without anyone noticing.
export interface MemorySource {
  composition: HouseholdComposition | null;
  dietaryFramework: string | null;
  maxCookTimeWeeknight: number | null;
  deepAnswers: Array<Pick<DeepAnswer, "questionId" | "values">>;
}

// Every memory a finished interview writes: the headline, then one per deep
// answer that actually carried signal. All stamped sourceType:'onboarding' by
// the caller.
//
// BUG-013: the sentence is built HERE, from the server's own question bank. It
// is the text the You ledger reads back under "You told me when we started", so
// its provenance has to be ours.
export function synthesizeMemories(state: MemorySource): SynthesizedMemory[] {
  const memories: SynthesizedMemory[] = [
    { content: synthesizeHeadlineMemory(state), category: "preference" },
  ];

  for (const answer of state.deepAnswers) {
    const question = DEEP_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) continue;

    const content = memoryForAnswer(question, answer.values);
    if (!content) continue;

    memories.push({
      content,
      // Shopping cadence is something they DO; the rest is what they like.
      // Read off the question, not off a dimension the caller sent.
      category: question.dimension === "shopping" ? "behavior" : "preference",
    });
  }

  return memories;
}

// The chef's opinionated read-back on the reflect screen. The brief asks for an
// actual cook's reaction, not a receipt, so this leads with a point of view the
// answers point at.
//
// REGISTER RULE (Griffin, S39): name a TECHNIQUE or an INGREDIENT FAMILY, never
// a specific plate. "Seared salmon with green beans" is a promise, and nothing
// carries it into generation — the plan is built from preferences and the seed
// request, neither of which knows this line exists. So the very first specific
// thing the product said would be wrong within the minute, on the screen whose
// entire job is to prove the chef was listening. "Fish takes to a hot pan" is
// the same voice and stays true whatever gets generated. Pure atmosphere is the
// other failure ("I feel like I'm in the Italian Alps" is a mood board, not a
// cook); the line has to have food in it.
//
// Ordered most-specific first, and the CORE-ONLY answers (diet, weeknight time,
// who's at the table) each earn a real line of their own. Someone who taps the
// four core questions and declines the deep round is the most common completion
// there is; falling through to a generic "I've got enough" would mean the one
// moment the whole flow builds toward never fires for most people.
//
// `mentions` is the honesty guard: a line naming a food is only usable if the
// user hasn't just told us never to cook it. Naming fish back to someone who
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
    mentions: ["shishito", "pepper", "chili", "fish", "seafood"],
    line: "Then we're getting on well. Blistered peppers, chili crisp, and fish that hits a hot pan.",
  },
  {
    applies: (s) => valueOf(s, "heat") === "hot",
    mentions: ["chili"],
    line: "Good. I'll actually season things, and there'll be chili crisp on the table.",
  },
  {
    applies: (s) => s.dietaryFramework === "vegan" || s.dietaryFramework === "vegetarian",
    mentions: ["broccoli"],
    line: "Charred vegetables with something rich underneath, then. No sad substitutes.",
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
    mentions: ["fish", "seafood", "green bean"],
    line: "Good. Fish takes to a hot pan faster than anything, and I like a green vegetable that gets some real char next to it.",
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
    mentions: ["pork", "cabbage"],
    line: "Half an hour is plenty. Hot pan, one good piece of protein, and a vegetable that goes sweet at the edges.",
  },
  {
    applies: (s) => !!s.maxCookTimeWeeknight && s.maxCookTimeWeeknight >= 75,
    mentions: ["beef", "braise"],
    line: "You've given yourself real time on a weeknight, so I'll put something braised on the list.",
  },
  {
    applies: (s) => valuesOf(s, "proteins").length > 0,
    line: "I've got a few ideas I want to try on you this week.",
  },
  {
    // The floor for anyone who answered the household question and little else.
    // Without it a skip-heavy run falls through to the generic line, and the
    // sparse reflect state — the one that most needs to sound unbothered —
    // becomes the flattest screen in the flow.
    applies: (s) => !!s.composition,
    line: "Two of you at the table is enough to start cooking.",
  },
];

// The sentence under the hook. Present only when the chef has something to add
// that the hook didn't already say, which is what makes a deeper interview read
// as richer at the TOP of the screen and not only in the middle of it. Returns
// null rather than filler: a second line that says nothing is worse than one
// strong line alone.
export function reflectSubline(state: InterviewState): string | null {
  const skill = valueOf(state, "skill");
  const effort = valueOf(state, "effort");

  if (skill === "pro" || skill === "confident") {
    return effort === "simple"
      ? "You can clearly cook, so I'll keep the steps short and put the interest in the ingredients."
      : "You cook, and you like the technique, so expect one dinner worth learning and the rest moving fast.";
  }
  if (skill === "learning") {
    return "I'll write these so nothing assumes you already know it, and the timings will be honest.";
  }
  if (!state.dietaryFramework && !state.maxCookTimeWeeknight) {
    return "I'll cook like I'm cooking for people I want to impress, and learn the rest from what you keep and what you push back on.";
  }
  return null;
}

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
//
// Every clause below except the last used to come from a DEEP answer, so the
// most common completion — answer the core four, decline the optional round —
// produced no request at all and handed off an empty box. The core answers are
// the ones every completing user has, so they carry the floor.
export function planSeedRequest(state: InterviewState): string | undefined {
  const parts: string[] = [];
  if (state.cuisinePreferences.length > 0) {
    parts.push(`leaning toward ${state.cuisinePreferences.slice(0, 3).join(", ")}`);
  }
  const skill = valueOf(state, "skill");
  if (skill === "learning") parts.push("with clear, forgiving steps");
  if (skill === "pro" || skill === "confident") parts.push("with room for real technique");
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
  if (goals.includes("less_waste")) parts.push("using up what a recipe opens");

  // The floor, from core answers alone. Time is the sharpest constraint the
  // core captures and the one a first plan most visibly obeys, so a user who
  // declined the whole deep round still hands off something real.
  if (parts.length === 0 && state.maxCookTimeWeeknight) {
    parts.push(`inside ${state.maxCookTimeWeeknight} minutes on a weeknight`);
  }

  if (parts.length === 0) return undefined;
  return `My first week: ${parts.join(", ")}.`;
}
