# What's Next

Last updated: 2026-07-10 (Session 18)

## Exact Status (Session 18 — Plan-tab feedback triage, part 1)
- **Griffin's feedback pass on the Plan tab has begun.** Batch 1 (mid-week state) triaged
  and the "now" items are FIXED: lowercase-day bug (`dayTitle()` + tightened tests) and
  the chip-quality prompt hardening (verb-first actions, no bare attributes, no title
  echoing — see decisions.md 2026-07-10). Product items logged in idea-backlog Incoming
  (structural action model, move-a-meal, variety miss).
- **`docs/scope-1C.md` now exists** — the milestone scope contract (13 features w/
  acceptance criteria, out-of-scope table, change log). Session protocol updated: open
  every session with a scope check against it, close by updating it. This answers
  Griffin's S18 visibility concern; keep the ritual.
- Gauntlet green (176/176). E2E: **30/30 green** on the final full-suite run (one M3
  flake under machine load earlier in the session; modify timeouts bumped 6s→10s).

## ▶ Next session
1. **Scope check first** (new protocol): read `docs/scope-1C.md`, restate what's left.
2. **Continue Griffin's feedback batches** — same triage discipline (bug/quality → fix
   now + E2E; product → discuss + log; visual → polish backlog).
3. **Verify chip quality on a fresh generation** (scope item 12) — regenerate a real
   plan, check chips are imperative and titles natural. If still drifting: few-shot
   examples, then consider a stronger model for plan tasks (scope item 13 variety too).
4. **Griffin's open calls** (scope-1C.md): does chip quality gate 1C exit? Pull
   Talk-to-Chef pill auto-send into 1C? Restore the 4 deleted `~/.claude/plans/` files
   (incl. the meal-app + FFOS master plans) — `git -C ~/.claude restore <paths>`, needs
   his go-ahead since it's outside this repo.

## ⭐ Griffin's calls (carry-over + new)
1. **Plan-file restore** (above) — recommend yes for the two master plans at minimum.
2. **Scope-1C open questions** — chip-quality gate + pill auto-send.
3. **Optional:** enable the Playwright MCP (~10 min) so Claude can drive a live browser
   in-session for exploratory checks. Complements the harness.

## Prior status (Session 17 — E2E harness Phase 1 + manual pass)
- **E2E harness built and green.** Playwright + server-side AI mock + auth bypass
  + DB seeding + a debug HUD. Plan-tab catalog now automated end to end except the
  low-risk G/R/W generate/review rows: D1-D7, RG1-RG5, M1-M7, **E1-E4 (elapsed),
  X1-X2 (error/retry)** → **30 passing, 0 findings**. Run `npm run test:e2e`.
- **A live manual pass (Session 17) caught two real bugs the harness had shipped
  past, both now fixed + committed + redeployed to prod:**
  - **D2 click-outside was dead in the browser** — the scrim inherited
    `pointer-events:none` from vaul's `modal={false}` portal. Fixed with
    `pointer-events-auto` on the scrim (`ui/drawer.tsx`). The harness's D2 test
    was green only because the fix landed in the same commit as the scaffold — so
    the harness *would* catch a regression, but the original prod bug reached
    users. Lesson: the harness didn't exist at Session 16 ship; now it guards this.
  - **No pointer cursor on any button** — Tailwind v4 dropped the default
    `cursor:pointer` on `<button>`. Fixed app-wide with a base rule + `cursor-grab`
    on the drawer handle (`globals.css`, `ui/drawer.tsx`).
- **Prod redeployed** (meal-app-swart.vercel.app) — was stuck on the Session 16
  build with the broken click-outside; now current.
- **What's left for you: the taste pass** (does the plan read well, do chips sound
  like imperatives, does it *feel* right). Mechanics are machine-verified.

*(S17's "Next session — feedback triage" brief executed in S18; the triage rules now
live in the session protocol + `docs/scope-1C.md`. D7 background-scroll: RESOLVED,
Griffin accepted scrollable background + click-outside; mobile touch-drag caveat —
confirm on-device when convenient.)*

## Prior status (Session 16, still relevant)
- **Phase**: Phase 1C (Plan Tab) — the design-led build pass is COMPLETE. All three Session 15 backlog items built (regenerate entry point, "AI is working" affordance, drawer dismissal), a high-effort dual review found + fixed 4 correctness bugs, and the gauntlet + production build are green (173/173 tests, +6 this session).
- **Session 16**: ux-design-critic designed the two app-wide patterns before building. Built: (1) regenerate/new-plan entry point via `intentMode` (re-prompts through the intent screen; no confirm dialog — the intent screen is the airlock) + a new elapsed-plan "week wrapped" state; (2) the in-place, scroll-independent AI-working affordance (MealCard `working`/`justChanged`, sheets stay open and close on success, bottom ack/error pills, optimistic `setData`, reusable `usePlanModify` hook, reachable error/retry); (3) drawer cleanup (shared X in `DrawerContent`, click-outside scrim that never touches body pointer-events, focus order). Dual review fixed: stale-modify-over-regenerate (token guard), removed-day highlight/scroll, global-pending-leaking-into-sheets (source scoping), stale pills over intent/streaming. Extracted `BottomBar`, removed dead `DrawerOverlay`.
- **Where the branch is**: `session-15-plan-fixes` — see "Branch / deploy" below for whether this session merged/pushed it.

## ⚠️ Manual verification Griffin still needs to run
No browser tool was available in Session 16, so the live UI was NOT click-tested (only lint/typecheck/tests/build/review). Run these in the app (dev server: `PORT=3001 npm run dev`, then the DevTools signin snippet):

1. **Test 8 — regenerate over an existing plan (the unblocked test).** With a plan present: draft → tap "Start over →"; confirmed → tap "Plan a new week →". Confirm it lands on the intent screen (pills + textarea), that a confirmed plan shows the "…will replace this week's meals" line, that "← Keep current plan" returns you, and that generating streams a NEW plan replacing the old one. Then confirm the old plan is gone (one-active-plan).
2. **Elapsed-plan state.** With a confirmed plan whose days are all in the past, confirm you get "That's a wrap on this week…" + thumbs recap + "Plan next week →" (not the old nonsensical mid-week view). Thumbs should still persist to chef memory.
3. **AI-working affordance on every modify path.** (a) inline card chip → the card dims + "Reworking {day}'s dinner…" + shimmer, then the new content lands with a highlight ring; (b) expanded-sheet action → sheet stays open showing pending, closes on success onto the changed card; (c) meal-scoped chat → same; (d) whole-week "Talk to the Chef" ("make this week lighter") → sheet pending, then a bottom pill with the chef's sentence that taps to scroll to the changed day. Confirm there is NO top-of-page toast anymore and no silent change.
4. **⭐ Drawer click-outside (highest-risk, un-click-tested).** Open each sheet (expanded + Talk-to-Chef) and tap the dimmed area outside it — it should close. Confirm this did NOT reintroduce the two-drawer pointer-events lockup (open a sheet, close via outside-tap, then tap a card — the card must still open). Also confirm the X still works and drag-to-dismiss still works. Note: background scroll while a sheet is open is now blocked by the scrim (accepted trade for click-outside — flag if you dislike it).
5. **Error path.** If you can force a modify failure (or just eyeball the code path): inline-chip failure → bottom "That didn't take — try again?" pill with Retry; sheet failure → the sheet stays open with the retry line.

## Branch / deploy — DONE this session
- **Merged + pushed**: `session-15-plan-fixes` → `main` (fast-forward), both on origin. This was the repo's FIRST push ever (needed `git config http.postBuffer 524288000` to get past an HTTP 400 on the large initial push).
- **Vercel**: the repo is git-connected and auto-deploys `main` → production. Correction to the old note: `OPENAI_API_KEY` (and all other prod env vars) were ALREADY set in Vercel Production (41 days ago) — the prerequisite was already met. Triggered a production deploy of Session 16 (`vercel deploy --prod`). The prior scaffold prod remains a rollback candidate. **Preview deploys lack `OPENAI_API_KEY`** (no Preview-scoped env var — only Development + Production), so branch previews have broken AI; set a Preview-scoped key if preview AI testing is wanted.
- Still owed: Griffin's manual test pass (Test 8 + affordance + click-outside) against the deployed prod URL or local.

## Known deviation
- `plan-page-client.tsx` is 330 lines (30 over the 300 rule). Every cohesive unit was already extracted; the rest is controller wiring + a render switch. Deliberately not split further (would mean a 20-prop presenter child). Overrule if you want it split.

## Key Files (Plan tab, post-Session-16)
- `src/components/plan/plan-page-client.tsx` — orchestrator (state + wiring + render switch)
- `src/components/plan/use-plan-modify.ts` — the AI-working affordance state machine (pending/changedDates/ack/error + token guard). Reusable by future tabs.
- `src/components/plan/meal-card.tsx` — `working`/`justChanged` props + `data-meal-date` scroll hook
- `src/components/plan/week-wrapped-state.tsx`, `past-meal-row.tsx`, `bottom-bar.tsx`, `modify-status-pills.tsx` — new
- `src/components/plan/expanded-meal-sheet.tsx`, `talk-to-chef-sheet.tsx` — sheets (stay open during modify)
- `src/components/ui/drawer.tsx` — shared X + click-outside scrim + focus order
- `src/app/api/plan/stream/route.ts` — streaming generation (replace-on-generate)
- `src/server/trpc/routers/plan.ts` — modify now returns `changedDates`
- `src/app/globals.css` — `.shimmer-bar` + `.animate-highlight-ring` keyframes

## Login on localhost (solved — don't rediscover)
- Google OAuth works on localhost:3001: Supabase Redirect URLs include it AND the proxy recognizes chunked cookies.
- If "sign-in loops back to /login" recurs: check cookie chunking first (`sb-*-auth-token.0/.1` vs the proxy regex in `src/lib/supabase/middleware.ts`).

## Development Workflow (established Session 8)
- Claude builds autonomously — don't stop for every change; check in when something cool is ready; only block on key product decisions.
- Codex QA / dual review at core milestones — mandatory. Run `/code-review` at the end of every build phase.
- Continuously ask "Is this how a senior engineer would build this?" Run the gauntlet (lint + typecheck + test + build) proactively.

## Open Questions Remaining
1. Free-form vs. structured list entry for Groceries (resolve during 1D)
2. AI-first preferences vs. static settings for You tab (resolve during 1E)
3. `recipe.get` returns `null` for missing recipes while `favorite`/`delete` throw NOT_FOUND — inconsistent; align during a 1D touch of the recipe router.
4. Working-label contextuality: currently day-level ("Reworking Tuesday's dinner…"). Verb-level ("Making it spicier…") was deferred as brittle; `workingLabel()` has a hook to enrich later if desired.
5. `scopedRequest` is a natural-language suffix, not a structural anchor — move to a structured `plan.modify` target if scoping proves unreliable.
