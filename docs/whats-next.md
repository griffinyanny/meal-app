# What's Next

Last updated: 2026-07-06 (Session 14)

## Exact Status
- **Phase**: Phase 1C (Plan Tab) BUILT and mid-manual-test. Security hardening pass COMPLETE. All work committed as of Session 14.
- **Where we are**: The full plan loop works — streaming generation (route handler + `useObject`), rolling-7-day model, in-place chip modify, expanded meal sheet, Talk-to-Chef free-form modify, confirm, mid-week view. Manual test loop (Session 12, 2026-05-31) passed Tests 1–3 of ~8, then stalled on a drawer bug (vaul body pointer-events conflict with two drawers in one tree). Fix (`modal={false}` + `noBodyStyles` on both sheets) is in but **was never retested** — that retest is the immediate pickup point.
- **Session 13–14 (2026-07-06)**: resumed after a month. Fixed the real login blocker: the proxy's cookie-presence check missed **chunked** Supabase session cookies (`sb-*-auth-token.0/.1` — Google OAuth sessions chunk), so authenticated users bounced to /login forever. Then ran a deep security audit (1 HIGH, 5 MED, 6 LOW) and fixed everything except deliberate deferrals. 163 tests passing (83 new router tests). Lint/typecheck clean.

## Manual test loop — where we are (dev server: PORT=3001, FFOS owns 3000)
Tests 1–4 are verbatim from Session 12; the original 5–8 wording is lost (transcript expired) — remaining tests reconstructed from built-but-untested surfaces.

| # | Surface | Status |
|---|---------|--------|
| 1 | Empty state → pill → streaming generate → today-start review | ✅ PASS |
| 2 | Card chip → in-place single-day modify | ✅ PASS (UX feedback in backlog: click-ack + card-scoped toast) |
| 3 | Card body → expanded sheet → action chip / swap | ✅ PASS + drawer bug found |
| 3R | **Drawer retest**: every card opens sheet on first tap, repeatedly; check background scroll + Talk-to-Chef send (fix removed vaul scroll-lock) | ⏳ **NEXT — never confirmed** |
| 4 | Talk to the Chef from hero → free-form modify (pills + textarea → `plan.modify`) | Not run (defined in Session 12) |
| 5 | Meal-scoped Talk to the Chef from the expanded sheet (chatScope) | Not run (reconstructed) |
| 6 | Confirm flow: "Looks good →" → status confirmed → batch-expand → grocery list | Not run (reconstructed) |
| 7 | Mid-week view: confirmed plan + past days → EARLIER THIS WEEK + thumbs feedback | Not run (reconstructed) |
| 8 | Regenerate over existing plan (one-active-plan replacement) + stream-error/retry states | Not run (reconstructed) |

## Next Session Should
1. **Drawer retest (3R)** — then Tests 4–8 in order. One test at a time, pass/fail, log UX feedback to backlog without fixing inline (except real interaction bugs).
2. After the loop: triage the UX backlog items from testing (click-ack/card-toast is the big macro one) into a polish pass.
3. Deploy to Vercel — prod is still the pre-1B scaffold and confused Griffin once already (looks like an old app). Needs `OPENAI_API_KEY` env + a redeploy.
4. Deferred security items when approaching real users: distributed per-minute rate limit (Upstash/Vercel KV; the Postgres daily budget is already distributed), full CSP with nonces, Next bump for the postcss advisory.

## Login on localhost (solved — don't rediscover)
- Google OAuth works on localhost:3001 now: Supabase Redirect URLs include it AND the proxy recognizes chunked cookies.
- If "sign-in loops back to /login" ever recurs: check cookie chunking first (`sb-*-auth-token.0/.1` vs the proxy regex in `src/lib/supabase/middleware.ts`).

## Key Files for Next Session
- `src/components/plan/` — all Plan tab UI (page-client, no-plan-state, streaming-plan, plan-review, plan-midweek, expanded-meal-sheet, talk-to-chef-sheet)
- `src/app/api/plan/stream/route.ts` — streaming generation (auth + Zod + rate limit + daily budget + CSRF origin check)
- `src/server/trpc/routers/plan.ts` — modify/confirm/feedback/current
- `src/server/ratelimit.ts` — per-minute (in-memory) + daily budget (Postgres, distributed)
- `src/server/db/migrations/0002_rls.sql`, `0003_ai_budget.sql` — RLS in repo + budget table; `src/server/db/rls.test.ts` is the CI guard
- `docs/idea-backlog.md` — UX feedback from testing lives here

## Development Workflow (established Session 8)
- Claude builds autonomously — don't stop for every change
- Give Griffin periodic check-in opportunities when something cool is ready
- Only block on key product decisions
- Codex QA at every core milestone — mandatory
- Self-directed refactoring: continuously ask "Is this how a senior engineer would build this?"
- Run the gauntlet (lint + typecheck + build) proactively, not just at commit time
- Run `/review` at the end of every build phase

## Open Questions Remaining
1. Free-form vs. structured list entry for Groceries (resolve during 1D)
2. AI-first preferences vs. static settings for You tab (resolve during 1E)
3. `recipe.get` returns `null` for missing recipes while `favorite`/`delete` throw NOT_FOUND — inconsistent; decide and align (surfaced by Session 14 test-writing)
4. Expanded card: bottom sheet vs. near-full-screen (validating bottom sheet in the current test loop)
