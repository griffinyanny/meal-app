# AI-mock pattern (the seam)

The reusable technique for making an "AI-native Next.js app" deterministically
E2E-testable without hitting a real LLM, without burning tokens, and without the
DB diverging from the UI.

## Why not `page.route`

Intercepting the AI HTTP call in the browser seems simplest but breaks
end-to-end truth:

- **Streaming generation**: the client refetches server state after the stream
  finishes (`onFinish` → invalidate the plan query). If the browser faked the
  stream, the server never persisted, so the refetch returns the OLD data and a
  "did it replace the plan?" assertion falsely fails.
- **Mutations (tRPC/RPC)**: you'd have to forge the exact serialized envelope
  (superjson batches, DB-consistent ids), and the DB still wouldn't match the UI.

## The seam: swap the model, keep the pipeline

Find the app's single choke point that returns the LLM model (here
`getModel(task)` in `src/server/ai/config.ts`). When a double-gated test flag is
on, return a mock model (`MockLanguageModelV3` from `ai/test`) instead of the
real provider. Everything above the model — retry, `streamObject`/`generateObject`
parsing, Zod validation, DB persistence, RPC serialization, cache invalidation —
runs for real against canned output.

```ts
export function getModel(task: AITask): LanguageModel {
  if (aiMockEnabled()) return makeE2EMockModel(task); // ai/test MockLanguageModelV3
  return realModelFor(task);
}
```

### Gating (never activates in prod)

```ts
export function aiMockEnabled(): boolean {
  // Explicit flag AND not a deployment. The flag lives ONLY in playwright.config
  // webServer.env — it is written to no .env file.
  return process.env.E2E_AI_MOCK === "1" && !process.env.VERCEL;
}
```

### The mock model

- `doGenerate` (object generation) returns the fixture JSON as one text block;
  the SDK parses it against the real schema.
- `doStream` (streaming) emits the fixture JSON as many small `text-delta` chunks
  via `simulateReadableStream`, so the client's partial-parse renders a genuine
  skeleton→filled sequence, then the SDK's `onFinish`/`onComplete` fires (→ real
  persistence).
- Route by inspecting the **user message only** (`role === "user"`), never the
  system prompt.

### `[E2E:*]` token grammar

Let specs steer behavior by planting tokens in the request string (which the app
carries into the prompt verbatim):

| Token | Effect |
|-------|--------|
| `[E2E:FAIL]` | throw → exercise the real error/retry UI |
| `[E2E:SLOW=<ms>]` | delay before responding → race/concurrency tests |
| domain keywords / title match | route to specific fixtures (e.g. scoped vs whole-week change) |

### Rate limits

If AI calls are rate-limited/budgeted before the model call, relax the in-memory
per-minute limiter under the mock flag (the suite fires many calls back-to-back).
Keep any persistent daily budget real; the reset helper clears the test user's
usage rows so runs don't accumulate.
