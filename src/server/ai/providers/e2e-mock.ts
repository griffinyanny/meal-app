// Server-side deterministic AI mock. When E2E_AI_MOCK is on, getModel() returns
// one of these instead of the real OpenAI model, so the ENTIRE real pipeline
// (retry, streamObject parsing, Zod validation, DB persistence, tRPC
// serialization, cache invalidation) runs against canned output — no network,
// no tokens, fully repeatable. This is the seam the E2E suite is built on.
//
// Safety: double-gated (explicit flag AND not a Vercel deployment) and the flag
// is only ever injected by playwright.config's webServer.env — it lives in no
// .env file, so a normal `npm run dev` / any prod build uses the real model.
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
  LanguageModelV3FinishReason,
} from "@ai-sdk/provider";
import type { AITask } from "../config";
import {
  buildGenerationFixture,
  buildGroceryTalkFixture,
  buildModificationFixture,
  buildNormalizeFixture,
  buildRecipeFixture,
  parseMockDirectives,
} from "./e2e-mock-fixtures";

export function aiMockEnabled(): boolean {
  return process.env.E2E_AI_MOCK === "1" && !process.env.VERCEL;
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  // Loud, single banner so it's obvious in server logs that no real AI is used.
  console.warn(
    "[e2e-mock] AI mock mode ACTIVE — getModel() is returning canned fixtures; no OpenAI calls will be made."
  );
}

const DEFAULT_LATENCY_MS = 400;
function latencyMs(): number {
  const raw = Number(process.env.E2E_AI_MOCK_LATENCY_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_LATENCY_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Flatten the USER message(s) to plain text so the fixtures can read the
// <current_plan> / <user_request> blocks and any [E2E:*] control tokens. The
// system prompt is deliberately excluded: it literally contains the strings
// "<user_request>" and "eating out" (as instructions), which would otherwise
// contaminate block extraction and request routing.
function promptToText(options: LanguageModelV3CallOptions): string {
  const parts: string[] = [];
  for (const msg of options.prompt) {
    if (msg.role !== "user") continue;
    for (const piece of msg.content) {
      if (piece.type === "text") parts.push(piece.text);
    }
  }
  return parts.join("\n");
}

const USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 200, text: 200, reasoning: 0 },
};

const FINISH: LanguageModelV3FinishReason = { unified: "stop", raw: "stop" };

class MockAiError extends Error {
  constructor() {
    super("[e2e-mock] forced failure ([E2E:FAIL] directive)");
    this.name = "MockAiError";
  }
}

// doGenerate: used by generateObject (the plan-modify task). Returns the whole
// fixture JSON as one text block; the SDK parses it against the Zod schema.
async function mockGenerate(task: AITask, options: LanguageModelV3CallOptions) {
  const text = promptToText(options);
  const { fail, slowMs } = parseMockDirectives(text);
  if (slowMs != null) await delay(slowMs);
  else await delay(latencyMs());
  if (fail) throw new MockAiError();

  const fixture =
    task === "plan-modify"
      ? buildModificationFixture(text)
      : task === "recipe-generate"
        ? buildRecipeFixture(text)
        : task === "ingredient-normalize"
          ? buildNormalizeFixture(text)
          : task === "grocery-talk"
            ? buildGroceryTalkFixture(text)
            : null;

  if (fixture === null) {
    throw new Error(
      `[e2e-mock] no doGenerate fixture for task "${task}" — add one if a spec needs it.`
    );
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(fixture) }],
    finishReason: FINISH,
    usage: USAGE,
    warnings: [],
  };
}

// doStream: used by streamObject (the plan-generate task). Emits the fixture
// JSON as many small text-deltas so the client's partial-parse renders a real
// skeleton→filled sequence, then the SDK's onFinish fires (→ persistPlan).
async function mockStream(task: AITask, options: LanguageModelV3CallOptions) {
  const text = promptToText(options);
  const { fail, slowMs } = parseMockDirectives(text);

  if (task !== "plan-generate") {
    throw new Error(
      `[e2e-mock] no doStream fixture for task "${task}" — add one if a spec needs it.`
    );
  }

  if (fail) {
    return {
      stream: simulateReadableStream<LanguageModelV3StreamPart>({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "error", error: new MockAiError() },
        ],
        chunkDelayInMs: 20,
      }),
    };
  }

  const json = JSON.stringify(buildGenerationFixture());
  // ~24 roughly-even slices so the partial JSON parser fills progressively.
  const sliceLen = Math.max(1, Math.ceil(json.length / 24));
  const deltas: LanguageModelV3StreamPart[] = [];
  for (let i = 0; i < json.length; i += sliceLen) {
    deltas.push({
      type: "text-delta",
      id: "1",
      delta: json.slice(i, i + sliceLen),
    });
  }

  const chunks: LanguageModelV3StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "1" },
    ...deltas,
    { type: "text-end", id: "1" },
    { type: "finish", finishReason: FINISH, usage: USAGE },
  ];

  return {
    stream: simulateReadableStream<LanguageModelV3StreamPart>({
      chunks,
      initialDelayInMs: slowMs ?? 0,
      chunkDelayInMs: 60,
    }),
  };
}

export function makeE2EMockModel(task: AITask): LanguageModelV3 {
  warnOnce();
  return new MockLanguageModelV3({
    modelId: `e2e-mock-${task}`,
    provider: "e2e-mock",
    doGenerate: (options) => mockGenerate(task, options),
    doStream: (options) => mockStream(task, options),
  });
}
