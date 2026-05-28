import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRecipe } from "./generate-recipe";
import * as aiModule from "@/server/ai";

vi.mock("@/server/ai", () => ({
  generateStructured: vi.fn(),
}));

const mockGenerateStructured = vi.mocked(aiModule.generateStructured);

const validRecipe = {
  title: "Garlic Butter Salmon",
  description: "Simple pan-seared salmon with garlic butter sauce",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  totalTimeMinutes: 25,
  ingredients: [
    { qty: "2", unit: "fillets", item: "salmon", notes: "6oz each" },
    { qty: "2", unit: "tbsp", item: "butter" },
    { qty: "3", unit: "cloves", item: "garlic", notes: "minced" },
  ],
  steps: [
    { number: 1, text: "Pat salmon dry and season with salt and pepper." },
    {
      number: 2,
      text: "Heat butter in a skillet over medium-high heat.",
      durationMinutes: 2,
    },
    {
      number: 3,
      text: "Sear salmon skin-side up for 4 minutes, flip, add garlic.",
      durationMinutes: 4,
    },
  ],
  tags: ["seafood", "quick", "keto-friendly"],
};

describe("generateRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a valid recipe for a simple prompt", async () => {
    mockGenerateStructured.mockResolvedValue(validRecipe);

    const result = await generateRecipe({ prompt: "Quick salmon dinner" });

    expect(result.title).toBe(validRecipe.title);
    expect(result.ingredients).toHaveLength(validRecipe.ingredients.length);
    expect(result.steps).toHaveLength(validRecipe.steps.length);
    expect(mockGenerateStructured).toHaveBeenCalledOnce();
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "recipe-generate",
        prompt: expect.stringContaining("Quick salmon dinner"),
      })
    );
  });

  it("should pass dietary context in the user message, not the system prompt", async () => {
    mockGenerateStructured.mockResolvedValue(validRecipe);

    await generateRecipe({
      prompt: "Something for dinner",
      dietaryFramework: "keto",
      restrictions: ["dairy"],
      dislikedFoods: ["mushrooms"],
    });

    const call = mockGenerateStructured.mock.calls[0][0];
    // User data must live in the prompt (user role), wrapped in a delimiter —
    // never interpolated into the static system prompt. (We assert on
    // "mushrooms"/the delimiter, not "keto"/"dairy", since those words appear
    // in the static prompt's examples and allergen list.)
    expect(call.prompt).toContain("<user_context>");
    expect(call.prompt).toContain("keto");
    expect(call.prompt).toContain("dairy");
    expect(call.prompt).toContain("mushrooms");
    expect(call.system).not.toContain("mushrooms");
  });

  it("should pass memories in the user message, not the system prompt", async () => {
    mockGenerateStructured.mockResolvedValue(validRecipe);

    await generateRecipe({
      prompt: "Something for dinner",
      memories: ["Prefers spicy food", "Cooks with cast iron"],
    });

    const call = mockGenerateStructured.mock.calls[0][0];
    expect(call.prompt).toContain("Prefers spicy food");
    expect(call.prompt).toContain("Cooks with cast iron");
    expect(call.system).not.toContain("Prefers spicy food");
  });

  it("should propagate errors from the AI service", async () => {
    mockGenerateStructured.mockRejectedValue(new Error("AI service timeout"));

    await expect(
      generateRecipe({ prompt: "Something for dinner" })
    ).rejects.toThrow("AI service timeout");
  });
});
