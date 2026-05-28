import { generateStructured } from "@/server/ai";
import {
  buildChefSystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { aiRecipeSchema, validateAiRecipe, type AIRecipe } from "./types";
import type { Ingredient, Step } from "@/server/db/schema/recipes";

const MODIFY_INSTRUCTIONS = `## Recipe modification task
You are modifying an existing recipe based on the user's request. Produce a complete updated recipe — not a diff. Preserve everything the user didn't ask to change. The title should reflect the modification (e.g., "Dairy-Free Chicken Alfredo" if the original was "Chicken Alfredo" and the request was to remove dairy).`;

interface ModifyRecipeInput {
  originalTitle: string;
  originalIngredients: Ingredient[];
  originalSteps: Step[];
  originalServings: number | null;
  modificationRequest: string;
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  memories?: string[];
}

export async function modifyRecipe(
  input: ModifyRecipeInput
): Promise<AIRecipe> {
  const context = buildUserContext({
    dietaryFramework: input.dietaryFramework,
    restrictions: input.restrictions,
    dislikedFoods: input.dislikedFoods,
    memories: input.memories,
  });

  const originalRecipe = JSON.stringify({
    title: input.originalTitle,
    servings: input.originalServings,
    ingredients: input.originalIngredients,
    steps: input.originalSteps,
  });

  const request = `Original recipe:\n${originalRecipe}\n\nModification request: ${input.modificationRequest}`;

  const raw = await generateStructured({
    task: "recipe-modify",
    system: `${buildChefSystemPrompt()}\n\n${MODIFY_INSTRUCTIONS}`,
    prompt: context ? `${context}\n\n${request}` : request,
    schema: aiRecipeSchema,
  });

  return validateAiRecipe(raw);
}
