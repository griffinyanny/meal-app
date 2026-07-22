# What's Next

Last updated: 2026-07-22 (Session 33)

## ▶ NEXT SESSION — 1E You audit surface BUILT + verified (S33). Only the onboarding interview (#4) remains, and it's DESIGN-GATED. Next move: design + build #4 to CLOSE 1E.
**The You-tab audit surface is built, verified, and on a branch pending Griffin's taste pass** (see the taste-pass
handoff in the S33 wrap / changelog). Shipped: #1 shell + account, #2 hard-constraint direct edit, #3 memory ledger
(+ `memory.deactivate`/`reactivate`), #5 capture confirmation + undo, #6 implicit surfaced/dismissible, and — Griffin's
call — the design's hero, the **AI capture task `user.talk`** (`preferences-talk` prompt + `[N]` id-safety + pure
`applyPreferencesTalkOps`). All three inspection gaps folded in. Verified: **363 unit + 62 E2E** (first You coverage
Y1–Y9), **real-model safety eval 9/9 (0 safety failures)**, visual-QA (0 blockers/0 high vs Direction A), code review
(no critical; 4 findings fixed). Files: `src/components/you/*`, `src/server/trpc/routers/{memory,user-talk}.ts`,
`src/server/ai/{prompts,tasks}/preferences-talk.ts`, `tests/e2e/specs/you.spec.ts`, `scripts/1e-preferences-talk-eval.ts`.

**The next move: DESIGN then BUILD the onboarding interview (#4) — the last 1E feature.** It's the Pass-2 fast-follow
(1 direction) that inherits this audit surface's memory vocabulary: a short, **skippable** chef-led first-run
conversation that seeds `user_preferences` + ≥1 `sourceType:'onboarding'` memory, sets an onboarding-complete flag
(small additive schema), and hands off to the first plan. The audit surface (the destination) is now built, so the
on-ramp design is lower-novelty. **Design-gated: it needs its Claude Design pass before the build.** When #4 ships +
its E2E lands, **1E closes → M5 done → only 1F (polish/production-readiness) left.**

**Reusable capture backend already exists:** `user.talk` (NL → typed prefs/memory ops with the SAFETY-eval'd prompt)
is the same machinery the interview needs — the interview is a guided front-end over it (ask ≤4 questions, feed answers
through the capture path, write an `onboarding` memory). So #4 is mostly the conversational UI + a distill/seed step +
the flag, not new AI infrastructure.

**Carried, non-blocking:** owed taste passes (Slice C/D Groceries + Recipes reorg; Recipes double bottom-bar on a
phone) + the You-tab taste pass from S33. **BUG-005** (app-wide `font-sans`→serif in the capture) — confirm on-device;
if real, a one-line 1F fix. **BUG-003** (recipe.list harvest). Fold into 1F polish.

**⭐ Model recommendation: Opus 4.8** for the #4 design-brief + build — the onboarding flow is a conversational-AI
surface (distill answers → seed prefs/memory reliably, skip logic, first-plan handoff) where capture quality matters,
and it reuses the safety-critical `user.talk` path. (If you'd rather just do the carried polish / font fix / taste-pass
triage instead, that's light enough for Sonnet 5.)

**Copy-paste kickoff prompt (Phase 1E close — onboarding interview #4, DESIGN-FIRST):**
> Resume meal app. **The You-tab audit surface is built + verified (S33); only the onboarding interview (#4) remains to
> close Phase 1E, and it's design-gated.** Read `docs/whats-next.md`, `docs/scope-1E.md`, `docs/scope-v1.md`, and
> `docs/design/surfaces/you/brief.md` first, then give me the ≤6-line scope check. Then **design the onboarding
> interview (Pass 2, 1 direction)** — write `docs/design/surfaces/onboarding/brief.md` (a short, skippable chef-led
> first-run conversation that seeds `user_preferences` + an `onboarding` memory and hands off to the first plan,
> inheriting the audit surface's vocabulary) and give me the Claude Design kickoff prompt. **Don't build until I've run
> the design pass and picked a direction.** Note the `user.talk` capture backend already exists — the interview is a
> guided front-end over it. On Opus 4.8.

*(Build-independent alt: if you'd rather not wait on a design pass, triage the carried polish instead — confirm
**BUG-005** (font/serif) on-device and one-line-fix it if real, burn down the owed taste passes (Groceries/Recipes),
and look at **BUG-003**. Same kickoff, swap the ask for "do the carried 1F polish + bug triage; leave onboarding for a
design pass." On Sonnet 5.)*

## Exact Status (end of Session 30 — BUG-004 CLOSED + shipped)
- **BUG-004 resolved.** Full generation-architecture rethink shipped: normalize runs per-recipe during plan review
  (decoupled `plan.normalizeSlot` the walker fires after hydrate) and caches on the recipe row (`normalized_ingredients`,
  migration `0005` applied); confirm reads the cache + AI-normalizes only cache-misses → **zero AI calls at confirm on
  a fully-reviewed week → instant aggregate.** Phase D added the honest **"Finishing N recipes…"** straggler hint +
  early-confirm instrumentation.
- **Real-model eval PASSED (the load-bearing gate).** Per-recipe normalization == the old batch's merge quality
  (identical rows/sums/merges; scallion↔green-onion synonym canonicalized identically with no co-occurrence
  advantage). Latency: ~27s batch → **0 normalize calls at confirm** (aggregate ~0ms). Script:
  `scripts/bug004-normalize-eval.ts` (real spend — re-run for prompt-drift checks).
- **Code review found + FIXED a high-severity regression** before ship: `normalizeSlot` on the shared 10/min AI
  bucket would 429 user-visible hydrates on a full-week review. Fixed with a dedicated `bgAiProcedure` (own 30/min
  bucket, no daily-budget double-charge). `ratelimit.test.ts` locks the isolation.
- **Green:** lint + typecheck clean, **306 unit + 53 E2E** (GR-L1/GR-L2 new). The S28 60s stopgap timeout stays as
  belt-and-braces for the rare residual batch.
- **Deferred follow-ups (idea-backlog):** split `grocery-generate.ts` (313 > 300); strengthen GR-L2 to drive the full
  straggler transition; ingredient caching (#3, global-vs-household open Q); section-streaming (#2, measurement-gated).
- **Owed to Griffin — taste pass** (carried from S28, non-blocking): Slice C/D Groceries + Recipes reorg; the double
  bottom-bar density on a phone.

## Exact Status (end of Session 28 — Phase 1D CLOSED, shipped to prod)
- **Phase 1D (Groceries) is COMPLETE — 4 of 6 R1 phases done; merged to prod.** Wrap: code review (3 fixes),
  **merge quality PASSED the real-model soft DoD (#2), Griffin signed off**, visual-QA capture harness extended to
  Groceries + Recipes (gate: 0 blockers / 0 high), 60s normalize stopgap. 294 unit + 51 E2E green; lint +
  typecheck clean.
- **Merge eval result:** 9/9 sums exact, scallions==green-onion canonicalization worked, zero mis-merges; NL→ops
  clean. The hard V1 problem is solved for V1.
- **Next:** generation-architecture rethink (planning session, BUG-004) — see the kickoff + model reco above.
- **Owed to Griffin — taste pass** (carried, non-blocking): Slice C/D Groceries + the Recipes reorg — does the
  tier split read calm? Is the **double bottom-bar** (floating toolbar over the tab bar) too heavy on a phone?
  Mechanics AND pixels are machine-verified (visual-QA gate passed).
- **Parked bugs** (`docs/bug-tracker.md`): BUG-004 (generation latency — next), BUG-002 (merge duplicate lines →
  buy-unit fast-follow), BUG-001 (guessCategory compound-word misfire), BUG-003 (harvest writes in `recipe.list`).
- **Still deferred (design later):** mid-week resync + ack pill + `mergeOverrides`; bespoke empty/error states;
  **1F visual-refresh of Plan** to the Groceries fidelity bar; **manual recipe entry** (the ＋ menu's dropped "Add
  manually").

## Exact Status (end of Session 27 — Phase 1D Slice D COMPLETE)
- **Slice D done: #11 Talk-to-Chef ✅ + #12 staples ✅ (S26) + #14 Recipes reorg ✅ (S27).** The chosen Claude
  Design (direction "d") is built in real components: a `RECENTLY COOKED` strip, a segmented
  `All · Favorites · Cooked` library (paginated), a folded `FROM YOUR PLANS` shelf, and a floating search/＋
  toolbar. Favoriting a plan draft promotes it (detaches `sourcePlanId`) with a highlight ring + toast.
- **Cooked-signal harvest built** (`harvest-cooked.ts`): a recipe is cooked when it's the recipe of a past
  confirmed slot → lazy, idempotent, non-fatal stamp of `lastCookedAt` on `recipe.list`; cook + favorite both
  detach from the plan so history/promotions are durable. Draft = `sourcePlanId != null`.
- First-ever **Recipes E2E coverage**: RC1–RC10 (`recipes.spec.ts`) + 3 seed states. **294 unit + 51 E2E green**;
  lint + typecheck clean; prod build compiles.
- **Next:** Slice 5 wrap (real-model merge-quality eval + `/code-review` + `/visual-qa` + deploy) → closes 1D.
  See the kickoff prompt above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C/D done, only the wrap remains).

## Exact Status (end of Session 26 — Phase 1D Slice D partial)
- **Slice D: #11 Talk-to-Chef ✅ + #12 staples ✅** (the two Groceries-tab pieces, already in the imported
  design). **#14 Recipes-tab reorg is design-gated** — brief written + Claude Design pass kicked off (Griffin
  running it). Cooked signal decided (auto-stamp `lastCookedAt` from a past confirmed slot); its harvest builds
  with the reorg.
- Built S26: `staples` router + `StaplesRow`; the `grocery-talk` AI task (snapshot prompt + coercion) + the
  `grocery.talk` router (numbered-`[N]`-ref ID-safety, 12-op cap, add-dedupe); the Groceries brain-icon sheet
  reusing the relocated shared `TalkToChefSheet`; `grocery.addItem` `sourceType`; GR8–GR11 E2E + the
  `grocery-talk` fixture + staple seeding. **287 unit + 41 E2E green**; lint + typecheck clean.
- **Next:** #14 Recipes reorg (needs the design URL) → Slice 5 wrap. See the kickoff + the design-independent
  alternative above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C done, D partial, wrap remains).

## Exact Status (end of Session 25 — Phase 1D Slice C complete)
- **Phase 1D (Groceries): Slice 0 ✅ + A ✅ + B ✅ + Slice C ✅.** The shoppable list is built and
  machine-verified against the imported design. Features #7–10, #13, #16 met. Built: 7 grocery mutations
  (`editItem`/`splitItem`/`clearChecked`/`tidyItem` + `setOrganizeMode`/`reorderSections`/`reorderItems`), the
  optimistic `use-grocery-mutations` hook, the full UI (grouped↔manual toggle + `@dnd-kit` touch-first
  drag-reorder, inline merge-review, one-zone check-off + progress + banner, quick-add + dedupe, export), and
  GR1–GR7 E2E + grocery seed states. **248 unit + 37 E2E green**; lint + typecheck clean.
- **Next:** Slice D (staples + Talk-to-Chef + Recipes-tab reorg) — see the kickoff prompt above. Then Slice 5
  wrap (merge-quality eval on the real model + `/code-review` + `/visual-qa` on the new surfaces + doc pass +
  deploy).
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C done, D + wrap remain).



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
