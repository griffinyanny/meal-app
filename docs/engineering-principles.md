# Engineering Principles

Permanent development rules for the meal app. These apply to all code, all phases, every session. The CLAUDE.md engineering rules section is the compact version; this document has the full rationale.

---

## Code Quality Bar

**Target:** A senior engineer at a top tech company should review this codebase and say "this is solid."

### tRPC Boundary (most important architectural rule)
All business logic goes through tRPC procedures. No direct Drizzle calls from components. No Server Actions for mutations.

**Why:** This is the API-first contract. Future iOS/Android clients will hit the same API. If business logic leaks into React components or Server Actions, it has to be rewritten when mobile arrives. tRPC + TanStack React Query also gives reactive caching, optimistic updates, and background refetching that Server Actions can't match.

### No Duplication
Before creating any utility function, hook, helper, or component, search the codebase for existing implementations. Extract shared logic when 3+ similar implementations exist.

**Why:** AI-generated code tends to create fresh implementations rather than reusing existing ones. Over time, this creates parallel implementations that drift apart. The fix is explicit: search before creating.

### 300-Line File Limit
No source file (excluding tests) should exceed 300 lines. If a change would push a file past this limit, split it first.

**Why:** Large files are a context problem before they're a maintenance problem. Claude Code works better with focused, modular files. Components should extract sub-components. Routers should split by sub-domain. Schema files should split by table group.

### Type Safety
TypeScript strict mode. No `any` types. No `@ts-ignore`. No `as unknown as X` workarounds.

**Why:** tRPC gives end-to-end type safety from database to UI, but only if every link in the chain is typed. One `any` breaks the chain.

### Tests Alongside Code
Every tRPC procedure, AI pipeline, and utility function gets tests in the same commit as the implementation.

**Why:** Tests written later get deprioritized. Tests written alongside the code serve as a design tool -- they force thinking about interfaces and edge cases before overcommitting to an implementation.

---

## Testing Expectations

### What to Test

| Layer | What to test | How |
|-------|-------------|-----|
| tRPC procedures | Happy path + auth middleware (unauthorized fails) | Integration tests with mocked DB |
| AI pipelines | Valid response, malformed response, timeout/error | Mocked LLM responses |
| Pure utilities | All edge cases (empty, null, boundary values) | Unit tests |
| System prompts | Content hasn't changed unexpectedly | Vitest inline snapshots |
| Zod schemas | Valid and invalid inputs | Unit tests |

### What NOT to Test
- React component rendering (until UI stabilizes, then add E2E)
- Supabase client initialization
- Third-party library internals

### Testing Patterns
- Co-located test files (not `__tests__/` directories)
- Mock external boundaries only (LLM providers, Supabase client)
- Arrange-Act-Assert pattern
- Descriptive names: "should return empty array when no recipes exist"

---

## Security Principles (Non-Negotiable)

- **RLS on every table** with `is_household_member()` check. CI verifies this.
- **SUPABASE_SERVICE_ROLE_KEY is server-only.** Never `NEXT_PUBLIC_`. Never in client bundles.
- **All inputs: Zod validation.** All AI outputs: Zod validation.
- **URL imports: SSRF protection** (block private IPs, validate domains, timeout, size limit).
- **AI prompt hygiene:** Untrusted content in `user` role ONLY, never in system prompt.
- **Production AI logs: metadata only** (model, latency, cost, tokens, success/fail). No health data in logs.
- **Per-user rate limiting** on all AI-calling endpoints.
- **UUIDs for all entity IDs** (no sequential enumeration).

---

## AI Development Principles

- **Model-agnostic provider interface.** Never hardcode a specific provider into business logic. Provider adapters live in `src/server/ai/providers/`.
- **Task-based routing:** Cheap models for routine tasks, premium for complex.
- **Structured output via Zod schemas.** The AI generates data that our code validates and processes. The AI never acts directly on the database or UI.
- **Streaming for user-facing generation** (plans, recipes). Named loading states ("Brainstorming dinners..."), never just spinners.
- **The personal chef system prompt is the single most important file.** Changes require deliberate review (snapshot tests).
- **Memory context assembly:** Load preferences + recent memories + history + time context before each AI call. Send only what the AI needs.

---

## Non-Functional Requirements Checklist

Use this checklist for every feature plan. Every item should have a deliberate answer (even if the answer is "not applicable").

- [ ] **Auth/RLS:** Who can access this? Is it enforced at the database level?
- [ ] **Performance:** Will this be slow with 1000+ items? Does it need pagination or virtualization?
- [ ] **Accessibility:** Keyboard navigation? Screen reader labels? Color contrast?
- [ ] **Error states:** What happens when the API fails? When data is missing? When the network is offline?
- [ ] **Loading states:** Descriptive text? Skeleton screens? Streaming?
- [ ] **Mobile:** Does this work on a phone screen (430px width)?
- [ ] **Security:** Any new auth surfaces? User input handling? URL fetching? AI prompt construction?
- [ ] **Tests:** What tests are needed? Are they accounted for in the implementation?

---

## Compound Learning Protocol

When Griffin corrects Claude's approach, the correction should become a permanent rule:

1. Griffin says "no, don't do it that way" or "yes, exactly like that"
2. Claude proposes: "Should I add this as a rule? Here's what I'd write: [rule text]"
3. If Griffin agrees, Claude adds it to the appropriate location:
   - Behavioral principle -> CLAUDE.md Engineering Rules section
   - File-type-specific pattern -> `.claude/rules/` file
   - Stack-specific knowledge -> this document
4. Every mistake should only happen once. The system gets smarter over time.

---

## Review Cadence

| Trigger | What runs | Who invokes |
|---------|-----------|-------------|
| Every `git commit` | Pre-commit hooks (lint + typecheck + tests) | Automatic (hooks) |
| Before multi-file features | `/architect` (architecture review) | Claude (auto-invoke) |
| End of every build phase | `/review` (multi-perspective code review) | Claude (auto-invoke) |
| Milestones M1, M3, M6 | `/codex-review` (independent Codex second opinion) | Griffin (explicit) |

---

## Common Anti-Patterns to Avoid

1. **Direct DB calls from components.** Always go through tRPC. Even for "simple" reads.
2. **Growing files instead of splitting.** If a component is getting big, extract sub-components before adding more.
3. **Creating new utilities without searching.** Always `grep` or `find` for existing implementations first.
4. **Skipping tests for "simple" code.** Simple code grows. Tests are cheaper to write now than to add later.
5. **Hardcoding AI provider logic.** Use the provider interface. Even if we only have one provider today.
6. **Generic loading states.** "Loading..." tells the user nothing. "Brainstorming dinners for this week..." tells them everything.
7. **Missing error fallbacks.** Every AI call can fail. Every API call can fail. The UI must handle this gracefully.
8. **Interpolating user content into system prompts.** Prompt injection risk. User content goes in the `user` role only.
