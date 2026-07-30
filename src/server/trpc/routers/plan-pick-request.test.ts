import { describe, it, expect } from "vitest";
import { buildPickRequest } from "./plan-pick-request";
import type { PickInput } from "@/server/ai/tasks/plan-picks";

const pick = (title: string): PickInput => ({
  id: `id-${title}`,
  title,
  servings: 4,
  totalTimeMinutes: 40,
});

describe("buildPickRequest", () => {
  it("should ask the chef to work the recipe in, never to schedule it", () => {
    // The wording IS the behaviour here: `plan.pick` has no free-text input, so
    // this sentence is the entire difference between a constraint and a
    // scheduler. "You choose which night" is the load-bearing clause.
    const request = buildPickRequest([pick("Carbonara")]);

    expect(request).toContain("Work Carbonara into this week");
    expect(request).toContain("from my own recipes");
    expect(request).toContain("You choose which night");
  });

  it("should name no day when the picker was opened from the intent screen or a week", () => {
    const request = buildPickRequest([pick("Carbonara")]);

    expect(request).not.toContain("Day ");
  });

  it("should honour a night the person already named, rather than re-deciding it", () => {
    // `3e`'s primary reads "Put it on Thursday". Tapping Thursday's dinner and
    // then being told the chef will choose would make that primary a lie — so
    // the named night is an instruction here, not a hint.
    const request = buildPickRequest([pick("Carbonara")], 3);

    expect(request).toContain("Put Carbonara on Day 3, replacing what's planned there");
    expect(request).not.toContain("You choose which night");
    // The chef still owns everything else about the week.
    expect(request).toContain("Rebuild the rest of the week around it");
  });

  it("should treat day zero as a named day rather than as no day at all", () => {
    // The classic falsy-zero bug, and it would hand the night back to the chef
    // on exactly the day the person is most likely looking at: today.
    const request = buildPickRequest([pick("Carbonara")], 0);

    expect(request).toContain("Put Carbonara on Day 0");
    expect(request).not.toContain("You choose which night");
  });

  it("should list several picks readably and pluralise the ask", () => {
    const request = buildPickRequest([
      pick("Carbonara"),
      pick("Lamb Shoulder"),
      pick("Congee"),
    ]);

    expect(request).toContain("Carbonara, Lamb Shoulder and Congee");
    expect(request).toContain("they're from my own recipes");
    expect(request).toContain("which nights");
  });
});
