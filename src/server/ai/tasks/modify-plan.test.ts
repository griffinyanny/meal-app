import { describe, it, expect, vi, beforeEach } from "vitest";
import { modifyPlan } from "./modify-plan";
import * as aiModule from "@/server/ai";

vi.mock("@/server/ai", () => ({
  generateStructured: vi.fn(),
}));

const mockGenerateStructured = vi.mocked(aiModule.generateStructured);

const validModification = {
  chefResponse: "Swapped Tuesday for a lighter stir-fry.",
  changedMeals: [
    {
      dayOffset: 2,
      slotType: "recipe" as const,
      title: "Veggie Stir-Fry",
      description: "Lighter and quick",
      rationale: "Lighter midweek pick.",
      ingredientPreview: ["tofu", "broccoli"],
      tags: ["Light"],
      estTimeMinutes: 20,
      servings: 2,
      chips: ["Add a side", "Make it spicier"],
    },
  ],
  removedDayOffsets: [],
};

const currentMeals = [
  { dayOffset: 0, slotType: "recipe", title: "Salmon" },
  { dayOffset: 2, slotType: "recipe", title: "Beef Stir-Fry" },
];

// 2026-05-24 is a Sunday, so dayOffset 1 is a Monday — the day map the prompt
// now carries has to be built from a real date rather than assumed.
const WEEK_START = "2026-05-24";

describe("modifyPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should target the plan-modify task and return the modification", async () => {
    mockGenerateStructured.mockResolvedValue(validModification);

    const result = await modifyPlan({
      request: "Make Tuesday lighter",
      weekStart: WEEK_START,
      currentMeals,
    });

    expect(result).toEqual(validModification);
    expect(mockGenerateStructured).toHaveBeenCalledOnce();
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.objectContaining({ task: "plan-modify" })
    );
  });

  it("should include the current plan and the request in the user message", async () => {
    mockGenerateStructured.mockResolvedValue(validModification);

    await modifyPlan({ request: "Make Tuesday lighter", weekStart: WEEK_START, currentMeals });

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.prompt).toContain("<current_plan>");
    expect(call.prompt).toContain("Beef Stir-Fry");
    expect(call.prompt).toContain("<user_request>");
    expect(call.prompt).toContain("Make Tuesday lighter");
    // The request must never enter the static system prompt.
    expect(call.system).not.toContain("Make Tuesday lighter");
  });

  // BUG-031, SECOND DOOR. S45 fixed the day map for generation and nobody asked
  // whether modify had the same hole. It did: the only day vocabulary this
  // prompt supplied was `Day 0`, so S47's Layer B got "Placed Congee … on Day 0"
  // and "This dish fits perfectly on Day 1" written straight to the user.
  it("should carry a real day map so the chef can name the days it talks about", async () => {
    mockGenerateStructured.mockResolvedValue(validModification);

    await modifyPlan({
      request: "Make Tuesday lighter",
      weekStart: WEEK_START,
      currentMeals,
    });

    const call = mockGenerateStructured.mock.calls[0][0];
    // 2026-05-24 is a Sunday. Asserting the real mapping, not just the presence
    // of a block: a map that silently assumed a Monday start is precisely the
    // downgrade BUG-031 was, and it would satisfy a `toContain("dayOffset")`.
    expect(call.prompt).toContain("dayOffset 0 is Sunday, May 24");
    expect(call.prompt).toContain("dayOffset 1 is Monday, May 25");
  });

  it("should forbid internal dayOffset vocabulary in what the chef writes back", async () => {
    mockGenerateStructured.mockResolvedValue(validModification);

    await modifyPlan({
      request: "Make Tuesday lighter",
      weekStart: WEEK_START,
      currentMeals,
    });

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.system).toContain('NEVER WRITE "Day 0"');
    expect(call.system).toContain("Name the weekday instead");
  });

  it("should propagate errors from the AI service", async () => {
    mockGenerateStructured.mockRejectedValue(new Error("AI service timeout"));

    await expect(
      modifyPlan({ request: "Make Tuesday lighter", weekStart: WEEK_START, currentMeals })
    ).rejects.toThrow("AI service timeout");
  });
});
