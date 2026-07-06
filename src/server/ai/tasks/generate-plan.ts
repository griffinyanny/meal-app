import {
  buildPlanSystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { aiPlanSchema } from "./plan-types";

export interface PlanGenerationInput {
  request?: string;
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  householdSize?: number;
  maxCookTimeMinutes?: number;
  memories?: string[];
}

// Builds the params for a streamed plan generation. The route handler feeds
// these into generateStream(); user-supplied intent stays in the user message,
// wrapped in <user_request>, never in the static system prompt.
export function buildPlanStreamParams(input: PlanGenerationInput) {
  const context = buildUserContext({
    dietaryFramework: input.dietaryFramework,
    restrictions: input.restrictions,
    dislikedFoods: input.dislikedFoods,
    householdSize: input.householdSize,
    maxCookTimeMinutes: input.maxCookTimeMinutes,
    memories: input.memories,
  });

  const request = input.request?.trim();
  const intent = request
    ? `<user_request>\n${request}\n</user_request>\n\nPlan the week of dinners around this request.`
    : `The person didn't give specific direction — surprise them with a great week of dinners based on what you know about them.`;

  return {
    task: "plan-generate" as const,
    system: buildPlanSystemPrompt(),
    prompt: context ? `${context}\n\n${intent}` : intent,
    schema: aiPlanSchema,
  };
}
