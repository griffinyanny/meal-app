# What's Next

Last updated: 2026-07-06 (Session 15)

## Exact Status
- **Phase**: Phase 1C (Plan Tab) BUILT; manual test loop essentially COMPLETE (7/8 pass, Test 8 blocked on a missing flow). Security hardening COMPLETE (Session 14).
- **Session 15 (2026-07-06)**: ran the manual test loop 3R→8. Fixed 5 real interaction bugs inline (touch target, Enter-to-submit, meal-scoping correctness bug, drawer width, sheet opacity) + added X close buttons. Logged all UX/design feedback to the backlog. Discovered the **regenerate entry-point blocker** (Test 8 can't run). 167 tests passing (4 new for the scoping fix). Lint/typecheck clean. **Changes NOT yet committed.**
- **Where we are**: The plan loop works end-to-end. What's left is a **design-led build pass** (regenerate entry point + "AI is working" affordance + drawer dismissal) before 1C is truly done — those are patterns worth designing once, so bring in ux-design-critic.

## Manual test loop — RESULTS (dev server: PORT=3001, FFOS owns 3000)

| # | Surface | Status |
|---|---------|--------|
| 1 | Empty state → pill → streaming generate → review | ✅ PASS (re-validated S15 on fresh generation) |
| 2 | Card chip → in-place single-day modify | ✅ PASS (affordance feedback in backlog) |
| 3 | Card body → expanded sheet → action chip / swap | ✅ PASS |
| 3R | Drawer retest + touch target | ✅ PASS — was a hit-area bug (only text tappable); whole card now opens it |
| 4 | Talk to the Chef from hero → free-form modify | ✅ PASS (+ Enter-to-submit fixed) |
| 5 | Meal-scoped Talk to the Chef (chatScope) | ✅ FIXED — scope was cosmetic (headline only); now injects day+dish. Regression test added |
| 6 | Confirm flow → status confirmed | ✅ PASS (reseeded fresh data; confirm stays in review when no past days) |
| 7 | Mid-week view: past → EARLIER THIS WEEK + thumbs | ✅ PASS (all 3 sections, thumbs toggle+persist, chef link) |
| 8 | Regenerate over existing plan | ⛔ BLOCKED — no UI entry point exists (V1 blocker, see backlog). Backend replace-on-generate IS implemented |

## Next Session Should
1. **Design-led build pass (bring in ux-design-critic).** Three things that set app-wide patterns:
   - **Regenerate / "new plan" entry point** (V1 blocker) — where "plan next week" lives; backend already replaces on generate. Unblocks Test 8.
   - **"AI is working" affordance** — in-place, scroll-independent pending state for all modify paths (macro backlog item).
   - **Drawer click-outside-to-close** (X already shipped) — carefully, without breaking the `modal={false}` fix.
2. Re-run Test 8 once the entry point exists.
3. **Commit Session 15 work** (not yet committed) + run `/review`.
4. Deploy to Vercel — prod still on pre-1B scaffold. Needs `OPENAI_API_KEY` env + redeploy.
5. Triage the rest of the UX backlog into a polish pass (sticky-bar visual, chip tuning, etc.).
6. Deferred security items when approaching real users: distributed per-minute rate limit, full CSP with nonces, Next bump for the postcss advisory.

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
