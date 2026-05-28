---
globs: src/server/trpc/**/*.ts
---

# tRPC Router Rules

- Every mutation uses `protectedProcedure` (never `publicProcedure` for data-modifying operations).
- Every procedure has Zod input validation. No raw `any` inputs.
- Every procedure that touches the database verifies household membership via the auth middleware.
- No direct Supabase client calls. Use Drizzle ORM for all database operations.
- Every new procedure needs at least one test in a co-located `.test.ts` file.
- Log all AI-calling procedures: task type, model, latency_ms, token counts, success/failure.
- Rate limiting on AI-calling procedures (use the rate limit middleware).
- Queries use React Query caching. Mutations use optimistic updates where appropriate.
- Keep routers focused on one domain. If a router exceeds 300 lines, split by sub-domain.
