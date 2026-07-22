import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { aiMockEnabled, makeE2EMockModel } from "./providers/e2e-mock";

export type AITask =
  | "recipe-generate"
  | "recipe-parse-url"
  | "recipe-modify"
  | "ingredient-normalize"
  | "grocery-talk"
  | "preferences-talk"
  | "plan-generate"
  | "plan-modify"
  | "memory-extract";

const taskModelMap: Record<AITask, () => ReturnType<typeof openai>> = {
  "recipe-generate": () => openai("gpt-4.1-mini"),
  "recipe-parse-url": () => openai("gpt-4.1-mini"),
  "recipe-modify": () => openai("gpt-4.1-mini"),
  "ingredient-normalize": () => openai("gpt-4.1-mini"),
  "grocery-talk": () => openai("gpt-4.1-mini"),
  "preferences-talk": () => openai("gpt-4.1-mini"),
  "plan-generate": () => openai("gpt-4.1-mini"),
  "plan-modify": () => openai("gpt-4.1-mini"),
  "memory-extract": () => openai("gpt-4.1-mini"),
};

export function getModel(task: AITask): LanguageModel {
  // E2E test mode: swap in a deterministic mock so the whole pipeline runs
  // against canned output. Double-gated; inert unless explicitly enabled.
  if (aiMockEnabled()) return makeE2EMockModel(task);
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
