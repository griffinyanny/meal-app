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

describe("modifyPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should target the plan-modify task and return the modification", async () => {
    mockGenerateStructured.mockResolvedValue(validModification);

    const result = await modifyPlan({
      request: "Make Tuesday lighter",
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

    await modifyPlan({ request: "Make Tuesday lighter", currentMeals });

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.prompt).toContain("<current_plan>");
    expect(call.prompt).toContain("Beef Stir-Fry");
    expect(call.prompt).toContain("<user_request>");
    expect(call.prompt).toContain("Make Tuesday lighter");
    // The request must never enter the static system prompt.
    expect(call.system).not.toContain("Make Tuesday lighter");
  });

  it("should propagate errors from the AI service", async () => {
    mockGenerateStructured.mockRejectedValue(new Error("AI service timeout"));

    await expect(
      modifyPlan({ request: "Make Tuesday lighter", currentMeals })
    ).rejects.toThrow("AI service timeout");
  });
});
