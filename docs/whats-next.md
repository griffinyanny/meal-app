# What's Next

Last updated: 2026-05-27 (Session 11)

## Exact Status
- **Phase**: Phase 1B COMPLETE (functionally). Milestone M2 achieved. Phase 1C ready to begin.
- **Where we are**: Full recipe AI loop works end-to-end against the real OpenAI API. Generate a recipe from a prompt, import from a URL (with Jina fallback for bot-protected sites), modify into a new version, browse/search the library, favorite. AI service layer on Vercel AI SDK v6, personal-chef system prompt, SSRF-hardened URL parsing, AI memory core. Ran `/review` + `/codex-review` at the phase boundary; fixed all findings (SSRF, prompt injection, output validation, retry classification, optimistic updates). 30 tests passing, build clean.
- **What we were doing**: Built all of Phase 1B, switched LLM from Gemini (depleted credits) to OpenAI gpt-4.1-mini, debugged a stack of infra issues (DB SSL, Next.js 16 proxy/Turbopack deadlock, OpenAI strict schema, AllRecipes bot-block), then ran the full review gauntlet and fixed everything.
- **NOT yet committed**: All Phase 1B work + the proxy/DB fixes are staged for the first real commit (repo only has the initial scaffold commit). Also not yet re-deployed to Vercel.

## Next Session Should
1. **Commit + deploy if not already done** (verify Vercel still builds with the OpenAI env var — add `OPENAI_API_KEY` to Vercel env).
2. **Start Phase 1C: Plan Tab** (~2 weeks) — the signature experience:
   - Plan generation pipeline (constraints → weekly plan, structured output, uses AI memory context)
   - Plan modification pipeline (natural language → targeted changes)
   - All 6 Figma states (plan ready, Talk to the Chef, no-plan, option cards, expanded card, mid-week)
   - Chef voice (rationale lines, summaries), contextual chips, thumbs feedback
   - **Wire `generateStream` into the UI** — generation is 7-20s; streaming was deferred from 1B and should land here for plans + recipes
   - Goal (M3): open app → see generated plan → modify via Talk to Chef → confirm

## Phase 1B follow-ups (deferred, low priority)
- Streaming UI for generation (see above — do in 1C)
- `confirm()` → styled AlertDialog in recipe detail
- Dedup the two near-identical AI dialogs (generate/import) into a shared component
- Tune recipe generation quality (prompt refinement) — see idea-backlog
- Accepted risks (documented, not fixing): DNS-rebinding TOCTOU on URL import (IP-pinning overkill for this threat model); Jina does its own resolution (reduces our SSRF exposure, doesn't increase it)

## Key Files for Next Session
- `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` — Systems architecture + Phase 1 plan. Phase 1C details at line ~907.
- `docs/design/brief-plan-states.md` — the 6 Plan tab state briefs
- `docs/design/Guidelines.md` — Design system reference
- `src/server/ai/` — AI service layer (index.ts, config.ts, retry.ts, memory.ts, prompts/, tasks/). Add plan tasks here.
- `src/server/trpc/routers/plan.ts` — skeleton plan router (needs generate/modify/confirm/feedback)
- `src/server/ai/index.ts` — `generateStream` is built + logged but not yet consumed by any UI

## Development Workflow (established Session 8)
- Claude builds autonomously — don't stop for every change
- Give Griffin periodic check-in opportunities when something cool is ready
- Only block on key product decisions
- Codex QA at every core milestone — mandatory
- Self-directed refactoring: continuously ask "Is this how a senior engineer would build this?"
- Run the gauntlet (lint + typecheck + build) proactively, not just at commit time
- Run `/review` at the end of every build phase

## Milestone M2: ACHIEVED
- [x] Generate a recipe from a prompt (AI structured output, Zod-validated)
- [x] Import a recipe from a URL (SSRF-hardened, Jina fallback for blocked sites)
- [x] Modify a recipe into a new version (version chain)
- [x] Browse + search the recipe library, favorite recipes
- [x] AI memory core (chef context read/write)
- [x] `/review` + `/codex-review` done, all findings fixed, 30 tests passing

## Open Questions Remaining
1. Free-form vs. structured list entry for Groceries (resolve during 1D)
2. AI-first preferences vs. static settings for You tab (resolve during 1E)
3. Final naming for "Talk to the Chef" affordance (resolve during 1C build)
4. Expanded card: bottom sheet vs. near-full-screen (test both during 1C build)
5. ~~Recipe image strategy~~ RESOLVED: text-forward for V1 (no hero-image generation)
