import { describe, it, expect } from "vitest";
import {
  chefGuesses,
  isSparse,
  playbackGroups,
  weekDecisions,
} from "./playback";
import { buildDeepAnswer } from "./planner";
import { DEEP_QUESTIONS } from "./questions";
import { emptyInterviewState, type InterviewState } from "./types";

function withAnswer(
  state: InterviewState,
  id: string,
  values: string[]
): InterviewState {
  const q = DEEP_QUESTIONS.find((x) => x.id === id)!;
  return { ...state, deepAnswers: [...state.deepAnswers, buildDeepAnswer(q, values)] };
}

// The most common completion: four core taps, deep round declined.
const coreState: InterviewState = {
  ...emptyInterviewState(),
  composition: { adults: 2, children: 0, babies: 0, babyStage: null },
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  maxCookTimeWeeknight: 30,
};

describe("playbackGroups", () => {
  it("should group by kitchen logic rather than schema order", () => {
    const labels = playbackGroups(coreState).map((g) => g.label);
    expect(labels).toEqual(["AT THE TABLE", "HOW YOU EAT", "THE CLOCK"]);
  });

  it("should drop a group with nothing in it rather than show an empty slot", () => {
    // Nobody is shown what they failed to fill in — that is the whole reason
    // depth is never rendered as a count on this screen.
    const labels = playbackGroups(coreState).map((g) => g.label);
    expect(labels).not.toContain("IN THE KITCHEN");
  });

  it("should fill IN THE KITCHEN once the skill question is answered", () => {
    const state = withAnswer(coreState, "skill", ["confident"]);
    const kitchen = playbackGroups(state).find((g) => g.label === "IN THE KITCHEN");
    expect(kitchen?.facts[0].lead).toContain("confident");
  });

  it("should thicken a group rather than add one as the interview deepens", () => {
    const before = playbackGroups(coreState);
    let state = withAnswer(coreState, "heat", ["hot"]);
    state = { ...state, cuisinePreferences: ["Thai", "Japanese"] };
    const after = playbackGroups(state);

    // Same structure, more inside it. This is the design's core claim about how
    // depth should read, so it is asserted rather than left to inspection.
    expect(after.map((g) => g.label)).toEqual(before.map((g) => g.label));
    const eatingBefore = before.find((g) => g.label === "HOW YOU EAT")!.facts.length;
    const eatingAfter = after.find((g) => g.label === "HOW YOU EAT")!.facts.length;
    expect(eatingAfter).toBeGreaterThan(eatingBefore);
  });

  it("should write facts as sentences, never as label and value pairs", () => {
    const facts = playbackGroups(coreState).flatMap((g) => g.facts);
    for (const fact of facts) {
      expect(fact.lead).not.toContain(":");
    }
  });

  it("should say nothing at all for an interview that learned nothing", () => {
    expect(playbackGroups(emptyInterviewState())).toEqual([]);
  });
});

describe("weekDecisions", () => {
  it("should turn each captured thing into a decision about dinner", () => {
    const decisions = weekDecisions(coreState).join(" ");
    expect(decisions).toContain("30 minutes");
    expect(decisions).toContain("Fish or tofu");
  });

  it("should close on the safety promise, which is the one they need to believe", () => {
    const last = weekDecisions(coreState).at(-1)!;
    expect(last.toLowerCase()).toContain("shellfish");
    expect(last).toContain("never reaches your grocery list");
  });

  it("should sharpen rather than lengthen when the deep round is answered", () => {
    // The reward for going deeper is a more specific week. The count rising is
    // incidental; what matters is that new answers produce new commitments.
    const shallow = weekDecisions(coreState);
    let state = withAnswer(coreState, "heat", ["hot"]);
    state = withAnswer(state, "leftovers", ["love"]);
    const deep = weekDecisions(state);

    expect(deep.length).toBeGreaterThan(shallow.length);
    expect(deep.join(" ")).toContain("Heat built in");
    expect(deep.join(" ")).toContain("two lunches");
  });

  it("should let a weekend project coexist with a weeknight ceiling", () => {
    const state = withAnswer(coreState, "effort", ["project"]);
    expect(weekDecisions(state)[0]).toContain("as long as it takes");
  });

  it("should still describe a week when the chef was told almost nothing", () => {
    // The block's heading promises a week, so it always delivers one.
    const decisions = weekDecisions(emptyInterviewState());
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.join(" ")).toContain("Five dinners");
  });

  it("should strip the allergy marker from the safety promise", () => {
    expect(weekDecisions(coreState).join(" ")).not.toContain("(allergy)");
  });
});

describe("chefGuesses", () => {
  it("should name what it is assuming when nothing was said", () => {
    const guesses = chefGuesses(emptyInterviewState()).join(" ");
    expect(guesses).toContain("No allergies on file");
    expect(guesses).toContain("45 minutes");
  });

  it("should stop guessing at anything the user actually answered", () => {
    expect(chefGuesses(coreState)).toEqual([]);
  });
});

describe("isSparse", () => {
  it("should be true for a run that answered one question", () => {
    const state: InterviewState = {
      ...emptyInterviewState(),
      composition: { adults: 2, children: 0, babies: 0, babyStage: null },
    };
    expect(isSparse(state)).toBe(true);
  });

  it("should be false once the core round is done", () => {
    // Four answers is a profile, not a gap. Showing "what I'm guessing" here
    // would tell someone who completed the interview that it didn't count.
    expect(isSparse(coreState)).toBe(false);
  });
});
