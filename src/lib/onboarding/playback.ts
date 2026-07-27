// The reflect screen's playback (Phase 1E, feature #4 — design pass 3, S39).
//
// The old reflect screen played the interview back as one flat sentence in
// schema order ("Cooking for 2 adults, pescatarian, 30 minutes on a weeknight"),
// which read identically whether you had answered four questions or nine. The
// locked direction replaces it with two derived blocks:
//
//   WHAT I'VE GOT     what was captured, grouped by KITCHEN logic rather than
//                     column order, every fact written as a sentence the chef
//                     says rather than a label/value pair.
//   SO HERE'S YOUR WEEK  what each captured thing DECIDES about dinner.
//
// The second block is the load-bearing one. Answering more questions doesn't add
// rows to a list, it sharpens what the chef commits to — heat becomes a pantry
// decision, leftovers become a portion decision, shopping becomes a Sunday. That
// is what makes the deep round feel worth the taps, and it's why depth is never
// rendered as a count or a progress bar anywhere on this screen.
//
// Deterministic and pure for the same reason synthesize.ts is: these are typed
// answers we already hold exactly, and the last screen of a first run is the
// worst possible place to add a model call.
import { describeHousehold } from "@/lib/household";
import { restrictionLabel } from "@/components/you/constraint-utils";
import type { InterviewState } from "./types";

// A fact reads as one sentence. `lead` is the part the design sets in primary
// weight — the thing itself — and `rest` is the chef finishing the thought.
export interface PlaybackFact {
  lead: string;
  rest?: string;
}

export interface PlaybackGroup {
  label: string;
  facts: PlaybackFact[];
}

const DIET_PHRASE: Record<string, string> = {
  vegetarian: "Vegetarian.",
  vegan: "Vegan.",
  pescatarian: "Pescatarian.",
  keto: "Keto.",
  paleo: "Paleo.",
  mediterranean: "Mediterranean.",
  other: "Your own way of eating.",
};

const DIET_REST: Record<string, string> = {
  vegetarian: "Vegetables and pulses carry the week.",
  vegan: "No animal products, and no sad substitutes.",
  pescatarian: "Fish and vegetables carry the week.",
  keto: "Low carb, and fat is not the enemy.",
  paleo: "Whole ingredients, nothing from a packet.",
  mediterranean: "Olive oil, fish, and a lot of vegetables.",
  other: "You'll tell me as we go.",
};

function valueOf(state: InterviewState, questionId: string): string | null {
  return state.deepAnswers.find((a) => a.questionId === questionId)?.values[0] ?? null;
}

function valuesOf(state: InterviewState, questionId: string): string[] {
  return state.deepAnswers.find((a) => a.questionId === questionId)?.values ?? [];
}

// "Thai and Japanese", "chicken, fish and tofu".
function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function tableGroup(state: InterviewState): PlaybackFact[] {
  const facts: PlaybackFact[] = [];

  if (state.composition) {
    const roster = describeHousehold(state.composition);
    // describeHousehold returns null for an adults-only household, where the
    // count alone says everything. "Two of you" is the chef's phrasing for the
    // common case rather than a servings number read off a row.
    if (roster) {
      facts.push({ lead: capitalize(roster) + ".", rest: "Every night of the week." });
    } else {
      facts.push({
        lead: state.composition.adults === 1 ? "Just you" : `${state.composition.adults} of you`,
        rest: ", every night of the week.",
      });
    }
  }

  const leftovers = valueOf(state, "leftovers");
  if (leftovers === "love") {
    facts.push({ lead: "Leftovers are wanted.", rest: "They cover lunch the next day." });
  }
  if (leftovers === "fresh") {
    facts.push({ lead: "You'd rather cook fresh.", rest: "I won't plan the same thing twice." });
  }

  return facts;
}

function eatingGroup(state: InterviewState): PlaybackFact[] {
  const facts: PlaybackFact[] = [];

  const diet = state.dietaryFramework;
  if (diet && diet !== "omnivore" && DIET_PHRASE[diet]) {
    facts.push({ lead: DIET_PHRASE[diet], rest: DIET_REST[diet] });
  }

  const heat = valueOf(state, "heat");
  if (heat === "hot") facts.push({ lead: "Real heat.", rest: "Nothing held back." });
  if (heat === "mild") facts.push({ lead: "Mild.", rest: "Flavour rather than fire." });
  if (heat === "medium") facts.push({ lead: "A little kick,", rest: "noticeable but not loud." });
  if (heat === "varies") facts.push({ lead: "Heat depends on the dish.", rest: "I'll read the room." });

  // Both of these are phrased to dodge subject-verb agreement rather than to
  // pick a side of it: the lists are user-chosen and can be one item or five,
  // and "Fish are what you want" / "Italian are where you live" is the kind of
  // small wrongness that undoes a screen whose whole job is sounding like a
  // person who listened.
  const proteins = valuesOf(state, "proteins");
  if (proteins.length > 0) {
    facts.push({ lead: `More ${list(proteins).toLowerCase()}`, rest: "wherever it fits." });
  }

  if (state.cuisinePreferences.length > 0) {
    facts.push({
      lead: `Leaning ${list(state.cuisinePreferences.slice(0, 3))}`,
      rest: "most weeks.",
    });
  }

  return facts;
}

function kitchenGroup(state: InterviewState): PlaybackFact[] {
  const facts: PlaybackFact[] = [];

  const skill = valueOf(state, "skill");
  if (skill === "learning") {
    facts.push({ lead: "Still finding your feet,", rest: "so I'll keep the steps clear." });
  }
  if (skill === "comfortable") {
    facts.push({ lead: "Comfortable", rest: "following any recipe." });
  }
  if (skill === "confident") {
    facts.push({ lead: "A confident cook.", rest: "Technique is welcome." });
  }
  if (skill === "pro") {
    facts.push({ lead: "You cook for a living.", rest: "I won't simplify on your account." });
  }

  const effort = valueOf(state, "effort");
  if (effort === "simple") {
    facts.push({ lead: "Weeknights stay simple.", rest: "Few steps, few pans." });
  }
  if (effort === "project") {
    facts.push({ lead: "You like a project,", rest: "not just dinner." });
  }
  if (effort === "some_technique") {
    facts.push({ lead: "A little technique", rest: "is part of the fun." });
  }

  const goals = valuesOf(state, "goal").filter((g) => g !== "nothing");
  const GOAL_PHRASE: Record<string, string> = {
    more_veg: "more vegetables",
    more_protein: "more protein",
    lighter: "lighter meals",
    budget: "keeping costs down",
    less_waste: "less waste",
    kid_wins: "meals the kids actually eat",
  };
  const named = goals.map((g) => GOAL_PHRASE[g]).filter(Boolean);
  if (named.length > 0) {
    facts.push({ lead: "Working toward", rest: `${list(named)}.` });
  }

  return facts;
}

function clockGroup(state: InterviewState): PlaybackFact[] {
  const facts: PlaybackFact[] = [];

  if (state.maxCookTimeWeeknight) {
    facts.push({
      lead: `${state.maxCookTimeWeeknight} minutes`,
      rest: "on a weeknight. That's the ceiling, not the target.",
    });
  }

  const shopping = valueOf(state, "shopping");
  if (shopping === "weekly") facts.push({ lead: "One shop a week,", rest: "one big run." });
  if (shopping === "twice") facts.push({ lead: "A couple of shops a week,", rest: "topping up midweek." });
  if (shopping === "often") facts.push({ lead: "You shop whenever.", rest: "A store is close by." });

  return facts;
}

// What the chef captured, grouped the way a cook would think about it rather
// than the order the columns happen to sit in. Empty groups are dropped, so the
// card fills out as the interview goes deeper without the structure changing —
// nobody is shown a blank slot they failed to fill.
export function playbackGroups(state: InterviewState): PlaybackGroup[] {
  return [
    { label: "AT THE TABLE", facts: tableGroup(state) },
    { label: "HOW YOU EAT", facts: eatingGroup(state) },
    { label: "IN THE KITCHEN", facts: kitchenGroup(state) },
    { label: "THE CLOCK", facts: clockGroup(state) },
  ].filter((g) => g.facts.length > 0);
}

// The payoff block: every captured thing restated as a decision about dinner.
// Ordered so the sharpest constraint leads, because the first line is the one
// that gets read.
export function weekDecisions(state: InterviewState): string[] {
  const decisions: string[] = [];

  const effort = valueOf(state, "effort");
  if (state.maxCookTimeWeeknight) {
    decisions.push(
      effort === "project"
        ? `Nothing over ${state.maxCookTimeWeeknight} minutes on a weeknight, and one weekend cook that takes as long as it takes.`
        : `Nothing over ${state.maxCookTimeWeeknight} minutes, Monday through Friday.`
    );
  }

  const proteins = valuesOf(state, "proteins");
  const diet = state.dietaryFramework;
  if (proteins.length > 0) {
    decisions.push(`${capitalize(list(proteins))} at the centre of the week.`);
  } else if (diet === "pescatarian") {
    decisions.push("Fish or tofu at the centre. No meat on the list.");
  } else if (diet === "vegetarian" || diet === "vegan") {
    decisions.push("Vegetables lead every plate, and they get the good treatment.");
  }

  const heat = valueOf(state, "heat");
  if (heat === "hot") {
    decisions.push("Chilli, ginger and citrus in the pantry run. Heat built in, not offered on the side.");
  }
  if (heat === "mild") {
    decisions.push("Flavour from aromatics and acid rather than chilli.");
  }

  if (state.cuisinePreferences.length > 0) {
    decisions.push(
      `${list(state.cuisinePreferences.slice(0, 2))} most weeks, plus one night that borrows from somewhere else.`
    );
  }

  // Skill also drives the reflect subline, so these speak to what lands ON the
  // list rather than to how the recipes are written. Two lines saying the same
  // thing in different type sizes is the receipt problem this screen exists to
  // solve, so the overlap is avoided by content and not by wording.
  const skill = valueOf(state, "skill");
  if (skill === "learning") {
    decisions.push("Nothing that leans on a technique you haven't met yet.");
  }
  if (skill === "confident" || skill === "pro") {
    decisions.push("One dinner a week that actually asks something of you.");
  }

  const leftovers = valueOf(state, "leftovers");
  if (leftovers === "love" && state.composition) {
    decisions.push("Portions sized up, so two dinners hand you two lunches.");
  }

  const goals = valuesOf(state, "goal");
  if (goals.includes("less_waste") || goals.includes("budget")) {
    decisions.push("A bunch of herbs gets used twice, so nothing goes soft in the drawer.");
  }

  const shopping = valueOf(state, "shopping");
  if (shopping === "weekly") decisions.push("One list, one run, nothing midweek.");

  // Always last, and always present when there's anything to say: the safety
  // promise is the one the user most needs to believe, so it closes the block.
  if (state.restrictions.length > 0) {
    const named = list(state.restrictions.slice(0, 3).map((r) => restrictionLabel(r).toLowerCase()));
    decisions.push(`${capitalize(named)} never reaches your grocery list, not once.`);
  }

  // The genuinely sparse run still gets a week described to it, because the
  // block's heading promises one.
  if (decisions.length === 0) {
    return [
      "Five dinners most people love, nothing fussy and nothing strange.",
      "One dish at the weekend that tells me something about you.",
    ];
  }

  return decisions;
}

// Shown only when the chef is running mostly on defaults. Naming the guesses is
// the honest move: the alternative is silently planning against assumptions the
// user never made and never saw. Deliberately NOT in the red safety treatment —
// "I don't know your allergies" is a gap, and dressing a gap as a warning
// borrows weight from the recap that has actually earned it.
export function chefGuesses(state: InterviewState): string[] {
  const guesses: string[] = [];

  if (state.restrictions.length === 0) {
    guesses.push(
      "No allergies on file. If there's one, tell me before Monday and I'll never plan it again."
    );
  }
  if (!state.maxCookTimeWeeknight) {
    guesses.push("Around 45 minutes on a weeknight, which is generous.");
  }
  if (!state.dietaryFramework) {
    guesses.push("Nothing off the menu, and no diet to plan around.");
  }

  return guesses;
}

// True when the chef is working off so little that the guesses block earns its
// place. One answered question is not a filled-in profile; four is.
export function isSparse(state: InterviewState): boolean {
  return playbackGroups(state).reduce((n, g) => n + g.facts.length, 0) <= 1;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}
