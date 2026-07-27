// The deep-round question bank (Phase 1E, feature #4). The 4-question CORE
// (household / diet / allergies / weeknight time) is fixed and lives in the flow
// itself — it's load-bearing for a safe first plan and is never adaptive. This
// bank is the opt-in round after it: questions the chef picks from, in the order
// the planner decides, stopping when it has enough (see planner.ts).
//
// Every question carries an honest "why" line. That's a product rule, not
// decoration: a cook answering a fifth question deserves to know what it buys.
import type { DeepQuestion, InterviewState, QuestionOption } from "./types";

const MEAT_PROTEINS = new Set(["chicken", "beef", "pork"]);

const PROTEIN_OPTIONS: QuestionOption[] = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "tofu", label: "Tofu or tempeh" },
  { value: "beans", label: "Beans and lentils" },
  { value: "eggs", label: "Eggs" },
];

// Which proteins are still on the table given the dietary framework. Offering
// beef to a vegan is the kind of small wrongness that tells a user the app
// wasn't listening two screens ago.
function proteinOptionsFor(state: InterviewState): QuestionOption[] {
  const diet = state.dietaryFramework;
  return PROTEIN_OPTIONS.filter((o) => {
    if (diet === "vegan") return o.value === "tofu" || o.value === "beans";
    if (diet === "vegetarian")
      return o.value === "tofu" || o.value === "beans" || o.value === "eggs";
    if (diet === "pescatarian") return !MEAT_PROTEINS.has(o.value);
    if (diet === "keto" || diet === "paleo") return o.value !== "beans";
    return true;
  });
}

export const DEEP_QUESTIONS: DeepQuestion[] = [
  {
    id: "heat",
    dimension: "heat",
    headline: "How much heat do you actually want?",
    why: "Spice is the thing people most often wish their plan got right.",
    kind: "cards",
    multi: false,
    value: 1,
    options: [
      { value: "mild", label: "Keep it mild", sub: "Flavor, not fire" },
      { value: "medium", label: "A little kick", sub: "Noticeable, not loud" },
      { value: "hot", label: "Bring the heat", sub: "Go for it" },
      { value: "varies", label: "Depends on the dish", sub: "Read the room" },
    ],
  },
  {
    id: "proteins",
    dimension: "proteins",
    headline: "Anything you want to see more of?",
    why: "I'll build the week around what you actually like eating.",
    kind: "chips",
    multi: true,
    value: 0.95,
    options: PROTEIN_OPTIONS,
    optionsFor: proteinOptionsFor,
    // With a vegan diet the remaining options collapse to two, which isn't
    // worth a screen of its own.
    appliesTo: (s) => proteinOptionsFor(s).length >= 3,
  },
  {
    id: "cuisines",
    dimension: "cuisines",
    headline: "Which flavors do you lean toward?",
    why: "It shapes the whole week, and it's the easiest thing to get wrong.",
    kind: "chips",
    multi: true,
    value: 0.9,
    options: [
      { value: "Italian", label: "Italian" },
      { value: "Mexican", label: "Mexican" },
      { value: "Thai", label: "Thai" },
      { value: "Japanese", label: "Japanese" },
      { value: "Indian", label: "Indian" },
      { value: "Mediterranean", label: "Mediterranean" },
      { value: "Chinese", label: "Chinese" },
      { value: "American", label: "American classics" },
    ],
    // Already answered if free text or the core round filled cuisines in.
    appliesTo: (s) => s.cuisinePreferences.length === 0,
  },
  {
    // Distinct from the core weeknight-time question and from `effort`: time is
    // how many minutes you have, effort is how much you feel like doing tonight,
    // and this is what techniques are on the table at all. It's the only one of
    // the three that changes whether a recipe is executable rather than
    // appealing, which is why it outranks them (Griffin, S39). Self-rated on
    // purpose: what a cook thinks of themselves is the thing that should govern
    // how much the chef throws at them, and the stakes of getting it wrong are
    // one boring week, not a safety event.
    id: "skill",
    dimension: "skill",
    headline: "How comfortable are you in the kitchen?",
    why: "It changes what I'll put in front of you, and how honest my timings are.",
    kind: "cards",
    multi: false,
    value: 0.97,
    options: [
      { value: "learning", label: "Still learning", sub: "Keep the steps clear" },
      { value: "comfortable", label: "Comfortable", sub: "I can follow anything" },
      { value: "confident", label: "Confident", sub: "Give me some technique" },
      { value: "pro", label: "I cook for a living", sub: "Don't hold back" },
    ],
  },
  {
    id: "goal",
    dimension: "goal",
    // Where cost lives. Deliberately one option among several rather than a
    // question about money: "are you doing this to save money" singles a person
    // out, and "what are you working toward" gets the same signal from someone
    // who'd never answer the first version honestly (Griffin, S39).
    headline: "Anything you're working toward?",
    why: "I'd rather aim at it than have you correct me every week.",
    kind: "chips",
    multi: true,
    value: 0.85,
    options: [
      { value: "more_veg", label: "More vegetables" },
      { value: "more_protein", label: "More protein" },
      { value: "lighter", label: "Lighter meals" },
      { value: "budget", label: "Keep costs down" },
      { value: "less_waste", label: "Less food waste" },
      { value: "kid_wins", label: "Meals the kids eat" },
      { value: "nothing", label: "Nothing specific" },
    ],
  },
  {
    id: "effort",
    dimension: "effort",
    headline: "How ambitious should a weeknight get?",
    why: "Time is one thing. Whether you want to cook is another.",
    kind: "cards",
    multi: false,
    value: 0.8,
    options: [
      { value: "simple", label: "Keep it simple", sub: "Few steps, few pans" },
      { value: "some_technique", label: "A little technique", sub: "I enjoy it" },
      { value: "project", label: "I like a project", sub: "Give me something" },
      { value: "mixed", label: "Mix it up", sub: "Depends on the night" },
    ],
    // A 30-minute ceiling has already answered this. Asking anyway is the exact
    // failure the planner refuses elsewhere (re-asking something the user
    // already said reads as not listening), so the question is reserved for
    // cooks who gave themselves enough room for the answer to be open.
    appliesTo: (s) => (s.maxCookTimeWeeknight ?? 999) > 30,
  },
  {
    id: "leftovers",
    dimension: "leftovers",
    headline: "How do you feel about leftovers?",
    why: "It changes how I size meals and whether I plan them twice.",
    kind: "cards",
    multi: false,
    value: 0.7,
    options: [
      { value: "love", label: "Plan for them", sub: "Lunch sorted" },
      { value: "some", label: "Some are fine", sub: "Not every night" },
      { value: "fresh", label: "Cook fresh", sub: "I'd rather not" },
    ],
  },
  {
    id: "shopping",
    dimension: "shopping",
    headline: "How often do you shop?",
    why: "It decides what I can put late in the week without it going off.",
    kind: "cards",
    multi: false,
    value: 0.6,
    options: [
      { value: "weekly", label: "Once a week", sub: "One big run" },
      { value: "twice", label: "Couple times", sub: "Top-ups midweek" },
      { value: "often", label: "Whenever", sub: "I'm near a store" },
    ],
  },
];

// The memory sentence a given answer becomes. Written in the chef's voice, in
// the same register as the You tab's ledger, because that is exactly where the
// user will read it back. Returns null when the answer says nothing worth
// remembering ("nothing specific", or an empty skip).
export function memoryForAnswer(
  question: DeepQuestion,
  values: string[]
): string | null {
  const chosen = values.filter((v) => v !== "nothing");
  if (chosen.length === 0) return null;

  const labelOf = (v: string) =>
    question.options.find((o) => o.value === v)?.label ?? v;
  const list = (vs: string[]) => {
    const labels = vs.map(labelOf);
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  };

  switch (question.id) {
    case "heat":
      return {
        mild: "Prefers mild heat — flavor over fire.",
        medium: "Likes a little kick, nothing overwhelming.",
        hot: "Likes real heat; don't hold back on spice.",
        varies: "Heat depends on the dish; read the room.",
      }[chosen[0]] ?? null;
    case "proteins":
      return `Wants to see more ${list(chosen).toLowerCase()}.`;
    case "cuisines":
      return `Leans toward ${list(chosen)} flavors.`;
    case "skill":
      return {
        learning: "Still finding their feet in the kitchen; keep steps clear and timings honest.",
        comfortable: "Comfortable following any recipe.",
        confident: "A confident cook; technique is welcome.",
        pro: "Cooks professionally. Don't simplify on their account.",
      }[chosen[0]] ?? null;
    case "effort":
      return {
        simple: "Wants weeknights simple — few steps, few pans.",
        some_technique: "Enjoys a little technique on a weeknight.",
        project: "Likes a cooking project, not just dinner.",
        mixed: "Ambition varies by night.",
      }[chosen[0]] ?? null;
    case "goal":
      return `Working toward: ${list(chosen).toLowerCase()}.`;
    case "leftovers":
      return {
        love: "Wants leftovers planned in — they cover lunch.",
        some: "Some leftovers are fine, not every night.",
        fresh: "Would rather cook fresh than eat leftovers.",
      }[chosen[0]] ?? null;
    case "shopping":
      return {
        weekly: "Shops once a week in one big run.",
        twice: "Shops a couple of times a week.",
        often: "Shops whenever — a store is close by.",
      }[chosen[0]] ?? null;
    default:
      return null;
  }
}
