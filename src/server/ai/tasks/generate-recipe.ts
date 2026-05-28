import { generateStructured } from "@/server/ai";
import {
  buildChefSystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { aiRecipeSchema, validateAiRecipe, type AIRecipe } from "./types";

interface GenerateRecipeInput {
  prompt: string;
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  householdSize?: number;
  maxCookTimeMinutes?: number;
  memories?: string[];
}

export async function generateRecipe(
  input: GenerateRecipeInput
): Promise<AIRecipe> {
  const context = buildUserContext({
    dietaryFramework: input.dietaryFramework,
    restrictions: input.restrictions,
    dislikedFoods: input.dislikedFoods,
    householdSize: input.householdSize,
    maxCookTimeMinutes: input.maxCookTimeMinutes,
    memories: input.memories,
  });

  const request = `Generate a recipe based on this request: ${input.prompt}`;

  const raw = await generateStructured({
    task: "recipe-generate",
    system: buildChefSystemPrompt(),
    prompt: context ? `${context}\n\n${request}` : request,
    schema: aiRecipeSchema,
  });

  return validateAiRecipe(raw);
}
