import { generateObject, generateText, streamObject } from "ai";
import type { Schema } from "zod";
import { getModel, AI_DEFAULTS, type AITask } from "./config";
import { withRetry } from "./retry";
import { logAICall } from "./logger";

interface GenerateStructuredOptions<T> {
  task: AITask;
  system: string;
  prompt: string;
  schema: Schema<T>;
  maxTokens?: number;
}

interface GenerateTextOptions {
  task: AITask;
  system: string;
  prompt: string;
  maxTokens?: number;
}

interface StreamStructuredOptions<T> {
  task: AITask;
  system: string;
  prompt: string;
  schema: Schema<T>;
  maxTokens?: number;
}

export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>
): Promise<T> {
  const model = getModel(options.task);
  const start = Date.now();

  return withRetry(options.task, async () => {
    try {
      const result = await generateObject({
        model,
        system: options.system,
        prompt: options.prompt,
        schema: options.schema,
        maxOutputTokens: options.maxTokens ?? AI_DEFAULTS.maxTokens,
        maxRetries: 0,
      });

      logAICall({
        task: options.task,
        model: result.response?.modelId ?? "unknown",
        latencyMs: Date.now() - start,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        success: true,
      });

      return result.object;
    } catch (error) {
      logAICall({
        task: options.task,
        model: "unknown",
        latencyMs: Date.now() - start,
        promptTokens: 0,
        completionTokens: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

export async function generateTextResponse(
  options: GenerateTextOptions
): Promise<string> {
  const model = getModel(options.task);
  const start = Date.now();

  return withRetry(options.task, async () => {
    try {
      const result = await generateText({
        model,
        system: options.system,
        prompt: options.prompt,
        maxOutputTokens: options.maxTokens ?? AI_DEFAULTS.maxTokens,
        maxRetries: 0,
      });

      logAICall({
        task: options.task,
        model: result.response?.modelId ?? "unknown",
        latencyMs: Date.now() - start,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        success: true,
      });

      return result.text;
    } catch (error) {
      logAICall({
        task: options.task,
        model: "unknown",
        latencyMs: Date.now() - start,
        promptTokens: 0,
        completionTokens: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

export function generateStream<T>(options: StreamStructuredOptions<T>) {
  const model = getModel(options.task);
  const start = Date.now();

  return streamObject({
    model,
    system: options.system,
    prompt: options.prompt,
    schema: options.schema,
    maxOutputTokens: options.maxTokens ?? AI_DEFAULTS.maxTokens,
    maxRetries: AI_DEFAULTS.maxRetries,
    onFinish({ usage, error, response }) {
      logAICall({
        task: options.task,
        model: response?.modelId ?? "unknown",
        latencyMs: Date.now() - start,
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        success: !error,
        error: error
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      });
    },
  });
}
