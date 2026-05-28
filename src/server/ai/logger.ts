import type { AITask } from "./config";

export interface AILogEntry {
  task: AITask;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  success: boolean;
  error?: string;
}

export function logAICall(entry: AILogEntry) {
  const level = entry.success ? "info" : "error";
  const msg = `[AI] ${entry.task} | ${entry.model} | ${entry.latencyMs}ms | ${entry.promptTokens}+${entry.completionTokens} tokens | ${entry.success ? "ok" : "fail"}`;

  if (level === "error") {
    console.error(msg, entry.error);
  } else if (process.env.NODE_ENV === "development") {
    console.log(msg);
  }
}
