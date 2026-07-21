# What's Next

Last updated: 2026-07-20 (Session 24)

## ▶ NEXT SESSION — Phase 1D (Groceries), Slice C (the shoppable list UI)
**Copy-paste kickoff prompt:**
> Resume meal app — Phase 1D Slice C (the shoppable list). Backend is done (Slice B, S24): `plan.confirm`
> creates the pending list, `grocery.generate` builds the merged/categorized projection (the pure under-merge
> aggregator + the `ingredient-normalize` task), and the Groceries tab already polls + renders
> generating/ready/error. Now build the **as-built design** at `docs/design/surfaces/groceries/imported.dc.html`
> (projectId `8bc73bfa-9683-4b44-ab06-40da9ec78590`): the categorized glass-row list; the **Grouped↔Ungrouped
> ("notepad") toggle** with section reorder + item drag (persist `organizeMode` + `aisleOrder` + item
> `position`); **inline merge-review** (amber dot when `sources.length > 1` → tap the row → per-meal breakdown
> + "Split into separate items" as a direct `grocery_items` edit); **one-zone check-off** (checked item → the
> single collapsible bottom "GOT IT" zone) + progress bar + quiet completion banner; **quick-add** (top +
> bottom inline rows, optimistic insert → background AI tidy → animate into section, dedupe pill); **clipboard
> export** (grouped plain text). Empty = zero-item list + add row. **Extend the E2E harness to Groceries**
> (generation states, one-zone check-off, quick-add + dedupe, reorder persistence). Plan:
> `~/.claude/plans/rippling-herding-glacier.md`; scope: `docs/scope-1D.md`.
> ⚠️ If DB calls fail with "tenant not found," the Supabase project auto-paused — resume it in the dashboard,
> then `set -a; . ./.env.local; set +a` before any `db:*` command.

- **No NEW design pass needed** — the Groceries design is already imported; Slice C *builds* it (visual-qa at
  wrap catches drift). **Design-independent alternative** if you'd rather skip UI this session: **Slice D's
  Talk-to-Chef NL→list-ops AI task** (new AI task + snapshot prompt + E2E fixture + Zod-validated ops, never
  trust AI-returned item IDs) — backend-shaped like Slice B.
- **Slice B recap (done S24):** the projection pipeline is built + unit-verified. `grocery.generate`
  (idempotent CAS on `generationStatus`, checkpointed phases, transactional replace of `sourceType:"recipe"`
  items) consumes the hydrated recipes and writes merged `grocery_items` with `sources` provenance. The
  aggregator **under-merges** (different name/unit/low-confidence ⇒ separate rows) and does all arithmetic in
  pure code (the AI only supplies grouping keys). **Amber = `sources.length > 1`** — Slice C renders it.
- **Key files (Slice B):** `src/server/grocery/aggregate.ts` (the pure under-merge core + parser),
  `src/server/ai/tasks/ingredient-normalize.ts` + `src/server/ai/prompts/ingredient-normalize.ts` (the task +
  snapshot-tested prompt), `src/server/trpc/routers/grocery-generate.ts` (orchestration),
  `src/components/groceries/groceries-page-client.tsx` (the tab), `src/lib/grocery-categories.ts` (client-safe
  taxonomy).
- **Not yet run on the real model:** merge quality (canonical sums + under-merge correct on a real week) is a
  wrap-time real-gen check + Griffin's taste pass; the E2E harness mocks the model.
- **Trimmed OUT of 1D** (design later): mid-week resync + ack pill + `mergeOverrides`; bespoke empty/error
  states (empty = zero-item list + add row; error = reuse Plan's stream-error card, already wired in Slice B).

## Exact Status (end of Session 24 — Phase 1D Slice B complete)
- **Phase 1D (Groceries): Slice 0 ✅ + Slice A ✅ + Slice B ✅.** A confirmed plan now produces a merged,
  categorized grocery list end to end (the M4 mechanic). Built: the pure `aggregate.ts` under-merge core (22
  unit tests), the `ingredient-normalize` AI task + snapshot-tested prompt + E2E fixture, `grocery.generate`
  orchestration (idempotent CAS + checkpointed phases + transactional replace), `plan.confirm`→pending list,
  and the Groceries tab (poll + generating/ready/error + one-shot generate trigger). **224 unit green**; lint +
  typecheck clean.
- **Next:** Slice C (the shoppable list UI) — see the kickoff prompt above. Then Slice D (staples +
  Talk-to-Chef + Recipes-tab reorg) → wrap (E2E extend + merge-quality eval + code-review + visual-qa +
  deploy).
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress. R1 boundary = solo-user MVP (sharing/realtime/cook mode →
  V1.5). Post-MVP gate unchanged.

## Exact Status (end of Session 23 — Phase 1D Slice A complete)
- **Phase 1D (Groceries): Slice 0 ✅ + Slice A ✅.** The hydration spine is built + machine-verified:
  `plan.hydrateSlot` (`plan-hydrate.ts`, status-column CAS, conditional write-back, 8 unit tests), the
  `use-plan-hydration` walker (day-1-first, sequential, tap-to-prioritize, cache-patch, skips past days),
  card shimmer→ready, the extracted `RecipeView` + the meal-sheet writing→full→failed upgrade, the
  `recipe-generate` E2E fixture, and `recipe.get` resolved by rule. **185 unit + 30 Plan E2E green.**
- **Not yet committed at time of writing / or just committed** — see git log. **Not yet run on the real
  model:** hydration quality (generated recipe faithful to the concept) is a wrap-time real-gen check.
- **Next:** Slice B (list generation + the merge) — see the kickoff prompt above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress. R1 boundary = solo-user MVP (sharing/realtime/cook
  mode → V1.5). Post-MVP gate unchanged.

## Exact Status (end of Session 19 — 1C CLOSED, scope system stood up)
- **Phase 1C (Plan tab) is COMPLETE.** 3 of 6 phases done. All 13 scope-1C items met;
  Griffin's feedback pass done; the two AI-quality items (chips + week variety) **verified
  on the real model** S19 (real-gen check, 3 requests: 100% imperative chips, 7/7 distinct
  dish forms — the 7×-grilled-salad and attribute-chip problems are gone).
- **Release-level scope system stood up** (Griffin's visibility ask): `docs/scope-v1.md`
  is the Release 1 hub (phase spine 1A–1F, DoD, out-of-scope, post-MVP gate); `scope-1C.md`
  is its spoke. Session ritual v2 in CLAUDE.md: every session opens with a ≤6-line scope
  check linking scope-v1.md. Linear deferred with explicit graduation triggers (decisions.md).
  R1 boundary locked = **solo-user MVP** (sharing UI/realtime/cook mode → V1.5).
- **Restored 4 accidentally-deleted `~/.claude/plans/` files** (incl. meal-app + FFOS
  master plans); meal-app master plan reconciled with the R1-boundary note + committed.
- Green: 176/176 unit, 30/30 E2E. Both repos pushed to main (meal-app `e631714`).

## ⭐ Griffin's calls (carry-over)
1. **Optional:** enable the Playwright MCP (~10 min) so Claude can drive a live browser
   in-session for exploratory checks. Complements the harness — more useful now that 1D
   has no Figma mocks to work against.
2. **scope-v1.md open question:** small closed beta beyond Griffin + wife before R1 ship,
   or is two-user validation enough? (Decide during 1E.)

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
