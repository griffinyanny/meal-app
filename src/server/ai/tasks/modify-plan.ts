import { generateStructured } from "@/server/ai";
import {
  buildPlanModifySystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { fence } from "@/server/ai/prompts/fence";
import { aiPlanModificationSchema, type AIPlanModification } from "./plan-types";
import { buildPicksBlock, type PickInput } from "./plan-picks";
import { buildDayMap } from "./generate-plan";

export interface CurrentMealSummary {
  dayOffset: number;
  slotType: string;
  title: string | null;
}

export interface ModifyPlanInput {
  request: string;
  /**
   * ISO date of dayOffset 0 — required so the chef can NAME the days it talks
   * about (BUG-031, second door). Generation has carried a day map since S45;
   * modify never did, so the only day vocabulary this prompt supplied was
   * `Day 0`, and the model wrote back exactly that: "Placed Congee … on Day 0",
   * "This dish fits perfectly on Day 1" — both onto strings the person reads.
   */
  weekStart: string;
  currentMeals: CurrentMealSummary[];
  /** W8 · library recipes the person is adding to a week that already exists. */
  picks?: PickInput[];
  /** True when the request already names the night (`3e`). See buildPicksBlock. */
  pickNightNamed?: boolean;
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

  const picks = buildPicksBlock(
    input.picks ?? [],
    input.householdSize,
    input.pickNightNamed
  );

  const body = [
    // Before the plan, for the same reason generation puts it first: the model
    // has to know what the days ARE before it reads a list addressed by number.
    buildDayMap(input.weekStart),
    // Both fenced: the plan lines carry meal TITLES, which on an imported
    // recipe originate from a third-party web page (see fence.ts).
    fence("current_plan", planLines),
    fence("user_request", input.request.trim()),
    picks,
    `Return only the changes.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return generateStructured({
    task: "plan-modify",
    system: buildPlanModifySystemPrompt(),
    prompt: context ? `${context}\n\n${body}` : body,
    schema: aiPlanModificationSchema,
  });
}
