// Drives the one AI task in the product that streams, and captures both objects
// the plan suite grades.
//
// `raw` is what the model returned. `validated` is what the app ships after its
// own repair pass — which dedupes days, splits the chef's two-part voice and
// strips a cooking method repeated across four or more titles. Grading model
// quality against `validated` would measure the repair, so the suite keeps both.
import { buildPlanStreamParams, type PlanGenerationInput } from "@/server/ai/tasks/generate-plan";
import { validatePlan, type ValidatedPlan } from "@/server/ai/tasks/plan-types";
import { generateStream } from "@/server/ai";
import type { AIPlan } from "@/lib/plan-schema";

export interface PlanOutput {
  raw: AIPlan;
  validated: ValidatedPlan;
}

export async function generatePlan(input: PlanGenerationInput): Promise<PlanOutput> {
  const result = generateStream<AIPlan>(buildPlanStreamParams(input));

  // Attach the rejection handler BEFORE anything else can throw. `result.object`
  // rejects on a failed stream, and an unobserved rejection would take down the
  // whole worker instead of failing this one case.
  const objectPromise = result.object;
  objectPromise.catch(() => undefined);

  // The final object only resolves once the stream completes, so it has to be
  // drained even though the partials themselves are not graded.
  for await (const _partial of result.partialObjectStream) {
    void _partial;
  }

  const raw = await objectPromise;
  const validated = validatePlan(raw, {
    weekStart: input.weekStart,
    defaultServings: input.householdSize ?? 2,
  });
  return { raw, validated };
}
