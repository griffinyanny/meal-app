import { generateStructured } from "@/server/ai";
import {
  buildPlanModifySystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { aiPlanModificationSchema, type AIPlanModification } from "./plan-types";

export interface CurrentMealSummary {
  dayOffset: number;
  slotType: string;
  title: string | null;
}

export interface ModifyPlanInput {
  request: string;
  currentMeals: CurrentMealSummary[];
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  householdSize?: number;
  maxCookTimeMinutes?: number;
  memories?: string[];
}

function describeMeal(meal: CurrentMealSummary): string {
  if (meal.slotType === "eating_out") return "Eating out";
  if (meal.slotType === "skip") return "No meal planned";
  return meal.title ?? "Untitled";
}

export async function modifyPlan(
  input: ModifyPlanInput
): Promise<AIPlanModification> {
  const context = buildUserContext({
    dietaryFramework: input.dietaryFramework,
    restrictions: input.restrictions,
    dislikedFoods: input.dislikedFoods,
    householdSize: input.householdSize,
    maxCookTimeMinutes: input.maxCookTimeMinutes,
    memories: input.memories,
  });

  const planLines = [...input.currentMeals]
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map((m) => `Day ${m.dayOffset}: ${describeMeal(m)}`)
    .join("\n");

  const body =
    `<current_plan>\n${planLines}\n</current_plan>\n\n` +
    `<user_request>\n${input.request.trim()}\n</user_request>\n\n` +
    `Return only the changes.`;

  return generateStructured({
    task: "plan-modify",
    system: buildPlanModifySystemPrompt(),
    prompt: context ? `${context}\n\n${body}` : body,
    schema: aiPlanModificationSchema,
  });
}
