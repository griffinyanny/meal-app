import { openai } from "@ai-sdk/openai";

export type AITask =
  | "recipe-generate"
  | "recipe-parse-url"
  | "recipe-modify"
  | "ingredient-normalize"
  | "plan-generate"
  | "plan-modify"
  | "memory-extract";

const taskModelMap: Record<AITask, () => ReturnType<typeof openai>> = {
  "recipe-generate": () => openai("gpt-4.1-mini"),
  "recipe-parse-url": () => openai("gpt-4.1-mini"),
  "recipe-modify": () => openai("gpt-4.1-mini"),
  "ingredient-normalize": () => openai("gpt-4.1-mini"),
  "plan-generate": () => openai("gpt-4.1-mini"),
  "plan-modify": () => openai("gpt-4.1-mini"),
  "memory-extract": () => openai("gpt-4.1-mini"),
};

export function getModel(task: AITask) {
  return taskModelMap[task]();
}

export const AI_DEFAULTS = {
  maxRetries: 1,
  timeoutMs: 30_000,
  // Streams surface tokens progressively (plan generation runs 7-20s healthy),
  // so they get a looser bound than one-shot calls.
  streamTimeoutMs: 60_000,
  maxTokens: 4096,
} as const;
