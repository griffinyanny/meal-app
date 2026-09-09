// The LLM judge for subjective checks.
//
// Three deliberate choices:
//   1. A DIFFERENT MODEL FAMILY than the one under test (Gemini grading OpenAI).
//      A model grading its own output shares its blind spots.
//   2. BINARY, reasoning first. "Rate 1-5" invites a 3 whenever the grader is
//      unsure, and the gap between a 3 and a 4 is not stable across runs or
//      graders. Pass/fail forces the question to be answerable.
//   3. THINKING LOW. Gemini bills thinking tokens at the output rate; for a
//      binary verdict on a short artifact they buy nothing and cost real money
//      on every case. (Measured: the larger Flash models spend ~80 thinking
//      tokens to answer "ok", and the newest of them returns 503 under load
//      often enough to be a poor basis for an instrument.)
//
// The judge is an instrument, and an uncalibrated instrument is not evidence —
// which is why every judged check is advisory until it has been measured against
// human labels. See evals/README.md.
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { judgeApiKey } from "./env";
import { recordJudgeUsage, PRICING } from "./meter";

const JUDGE_ATTEMPTS = 3;

export interface JudgeVerdict {
  passed: boolean;
  reasoning: string;
  /** True when no judge key is configured, so the check is skipped rather than scored. */
  unavailable?: boolean;
}

// Reasoning is declared FIRST so the model produces it before committing to a
// verdict — a verdict-first schema is a coin flip with a justification attached.
const verdictSchema = z.object({
  reasoning: z.string(),
  verdict: z.enum(["pass", "fail"]),
});

const SYSTEM = [
  "You are grading the output of a meal-planning assistant against one specific question.",
  "",
  "Answer only the question asked. Do not grade spelling, formatting, tone, or anything",
  "the question does not mention. Write one or two sentences of reasoning citing what you",
  "actually saw in the output, then give a verdict of exactly 'pass' or 'fail'.",
  "",
  "If the output plausibly satisfies the question, pass it. Reserve 'fail' for a clear,",
  "demonstrable violation you can point to. When genuinely torn, pass — a judge that fails",
  "on ambiguity produces noise, and this verdict is advisory.",
].join("\n");

export async function judgeOutput(
  question: string,
  content: string
): Promise<JudgeVerdict> {
  const apiKey = judgeApiKey();
  if (!apiKey) {
    return {
      passed: true,
      reasoning: "No GEMINI_API_KEY configured — judged checks skipped.",
      unavailable: true,
    };
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const prompt = [`QUESTION: ${question}`, "", "OUTPUT UNDER REVIEW:", content].join("\n");

  // Google's hosted models return 503 "high demand" often enough that a single
  // attempt would leave whole runs unjudged. Backoff, then give up quietly.
  let lastError: unknown;
  for (let attempt = 0; attempt < JUDGE_ATTEMPTS; attempt++) {
    try {
      const result = await generateObject({
        model: google(PRICING.judge.model),
        system: SYSTEM,
        prompt,
        schema: verdictSchema,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(30_000),
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
      });

      recordJudgeUsage(result.usage?.inputTokens ?? 0, result.usage?.outputTokens ?? 0);

      return {
        passed: result.object.verdict === "pass",
        reasoning: result.object.reasoning,
      };
    } catch (error) {
      lastError = error;
      if (attempt < JUDGE_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  // A broken judge must not fail a case — it is advisory by construction, and a
  // skipped check is reported as skipped rather than counted as a pass.
  return {
    passed: true,
    reasoning: `Judge unavailable: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    unavailable: true,
  };
}
