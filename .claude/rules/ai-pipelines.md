---
globs: src/server/ai/**/*.ts
---

# AI Pipeline Rules

- All structured outputs validated against Zod schemas before database writes. Reject if validation fails.
- User-supplied content goes in the `user` message role ONLY. Never interpolate user content into system prompts.
- Never include user email, real names, or household member identifiers in prompts. Send only: dietary preferences, restrictions, recipe history, behavioral memories.
- Every AI task must have: retry logic (1 retry on transient failure), timeout handling, graceful fallback ("Chef is busy, try again in a moment").
- Provider interface: `generateStructured<T>`, `generateText`, `generateStream`. No provider-specific code in task pipelines. Provider adapters live in `src/server/ai/providers/`.
- Log metadata in production (task type, model, provider, latency_ms, token counts, estimated cost, success/failure). Full prompts and responses only in development.
- The personal chef system prompt is the single most important file. Any change requires deliberate review. Use snapshot tests to flag prompt changes.
- Streaming for all user-facing generation (plans, recipes). Named loading states at the UI layer.
