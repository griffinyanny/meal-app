# Phase 1E Scope — You Tab + Memory

> **What this document is.** The phase-level scope contract: in-scope features with
> acceptance criteria, explicit deferrals, and a change log. The release-level view
> lives in [scope-v1.md](scope-v1.md) (the hub — start there); this doc is its 1E
> spoke and carries the detail/churn. Session ritual: see CLAUDE.md → Session Protocol.
> Griffin owns scope; Claude builds against it — nothing gets built that isn't in a
> scope doc, and scope changes land as change-log lines, not drift.

**Created:** 2026-07-22 (Session 32) · **Milestone:** M5 — "chef knows you; preferences editable" · part of V1 "The 10-Minute Weekly Ritual"
**Phase status:** ✅ **CLOSED 2026-07-26 (S40) — M5 met.** Audit surface BUILT + verified (S33); #4 onboarding interview BUILT + machine-verified (S36); Griffin's taste pass landed S39 and added scope rather than closing the phase; the three closing gates were re-run from scratch in **S40** after S39 invalidated the S38 ones. **All three cleared: `/visual-qa` 0 blockers / 0 high on onboarding AND You, Layer B verified the ingredient-reuse rule on the real model (and caught three defects the mock could not), `/code-review` across the S39 surface.** **480 unit + 78 E2E green, planner eval 7/7, lint + typecheck clean.** Next: **1E.7** (mechanical design-system sweep), then 1E.5.

---

## Milestone goal

The **You** tab closes the memory loop: the chef learns who you are (a conversational
first-run interview + capture from everyday use), and you can **see, trust, and correct**
what it believes. This is the phase that makes *week 12 better than week 1* — the payoff
of a personal chef over a recipe search box. It is the product's **trust surface**: the one
place you verify the AI isn't wrong about you (a mis-remembered allergy is a real-world harm,
not a cosmetic bug).

**Definition of done for 1E:**
1. Every in-scope feature below meets its acceptance criteria (machine-verified where mechanical).
2. A new user can complete (or skip) the onboarding interview and land in a working first plan that reflects what they said.
3. Everything in `getChefContext()` is visible in the You tab and correctable there — nothing the chef acts on is invisible to the user.
4. Griffin's taste pass: the audit surface reads as *trust and control*, not a settings form. *(The soft criterion — Griffin judges.)*

---

## The framing decision — Open-Question #2 RESOLVED

**Question (carried since S2):** AI-first preferences (say "I don't eat gluten anymore") vs. a static settings screen?

**Resolution: Hybrid, split by data type — AI-first is the *capture* path, structured is the *trust* surface. Not one mode.**

- **Capture is AI-first.** You never fill a preferences form to teach the chef. It learns three ways: the **onboarding interview** (conversational), **Talk-to-the-Chef** ("we went vegetarian" → written to memory), and **implicit signals** (thumbs on past meals). This is the product thesis ("AI proposes, user reacts"); anything else is what every competitor already ships.
- **The You tab is the audit/trust surface, not the primary editor.** Its job is to answer "what does my chef think it knows about me, and is any of it wrong?" — a verification surface with real *correction* controls, not a data-entry screen.
- **Two field classes, deliberately different treatment:**

| Class | Fields | Primary channel | You-tab treatment |
|-------|--------|-----------------|-------------------|
| **Hard constraints** (typed, safety/planning-load-bearing) | dietary framework, **restrictions/allergies**, household size, weeknight/weekend cook-time ceilings, cuisine leanings | AI-first to *set*, but **always directly editable** | Direct-edit controls (chips/steppers/picker). Never require a conversation to fix. |
| **Soft memory** (free-form, nuanced) | dislikes, brand choices, "we do Taco Tuesday," observed patterns | AI-captured (interview / talk / implicit) | A reviewable memory ledger — remove or edit any item; honest "how I learned this" label. |

- **Why the split, not pure-AI:** a wrong dietary restriction can put an allergen on the plate. Safety-critical values must be *directly* viewable and correctable without having to phrase a sentence the model parses right. Pure-AI-only fails the trust test; pure-settings fails the product thesis. The infra already reflects this hybrid — a typed `user_preferences` table **and** a free-form `ai_memories` table, both read by `getChefContext()`.

*(Full rationale → decisions.md, S32.)*

---

## What already exists (1E is mostly the surface, not the data model)

Built in 1A/1B and reused here — **do not re-spec**:
- `user_preferences` table + `user.preferences` (read) + `user.updatePreferences` (write). All hard-constraint fields already persist and validate (Zod).
- `ai_memories` table (content, category, `sourceType` ∈ explicit/implicit/onboarding, `confidence`, `isActive`) + `writeMemory()` + `user.memories` (read).
- `getChefContext(db, household, user)` — already merges prefs + top-50 active memories into the chef system prompt. **The chef already personalizes; 1E makes that loop visible and editable.**
- `user.ensureOnboarded` — silent first-login DB bootstrap (household + membership). **NOT** the interview; the interview is net-new.
- Implicit signal: thumbs-on-past-meals → memory (1C item 11) already writes `sourceType:'implicit'` memories.

**The 1E gap = frontend + a thin backend delta:** the whole You-tab UI, the onboarding interview flow + its AI task/distill, memory-management mutations (`deactivate`/`edit` — the `isActive` column exists but nothing toggles it), an onboarding-complete flag, and the capture-confirmation surfacing.

---

## In scope — with acceptance criteria

Status: ✅ shipped & E2E-verified · 🔶 shipped, iteration open · ⬜ not built

| # | Feature | Acceptance criteria | Status |
|---|---------|--------------------|--------|
| 1 | **You-tab shell + account/household basics** | Tab renders in our vocabulary: display name, email, household name, sign out. Foundation the audit sections hang on. Build-direct (no design pass). | ✅ S33 — `user.account` query + account footer; `you-page-client` orchestrator. |
| 2 | **Preferences audit surface — hard constraints (direct edit)** | Every `getChefContext` structured field is shown and directly editable: dietary framework (picker), **restrictions/allergies** (add/remove chips), dislikes/"no list," household size (stepper), weeknight + weekend cook-time ceilings, cuisine leanings. Edits persist via `user.updatePreferences` and **immediately change chef context** (next generation respects them). | ✅ S33 — safety-weighted card (allergy sub-label via a `(allergy)` marker) + soft card; `×`-remove + **direct inline add** (deviation: mock routed Add via chat, but #2 requires no-conversation editing); bottom-sheet picker/stepper for scalars. E2E Y1–Y4. |
| 3 | **Memory ledger — view + manage** | Active memories listed, grouped/labeled by how they were learned ("You told me when we started" / "You told me" / "I noticed"). User can **remove** (deactivate → drops from `getChefContext`, chef stops acting on it) and **edit** a memory's text. Removed memories don't reappear. Needs new `memory.deactivate` + `memory.edit` mutations (co-located tests, auth-checked). | ✅ S33 — `memory.list` (added `activeOnly` to `user.memories`) + `memory.deactivate`/`memory.reactivate` (household-scoped). **`memory.edit` dropped** (gap #1) — edit routes to Talk-to-Chef re-tell. Provenance ← `sourceType`. E2E Y5/Y7. |
| 4 | **AI-guided onboarding interview (conversational, first-run)** — ✅ **CLOSED S40** (built S36, deepened + replayed S39, all three gates cleared S40) | On first login a short chef-led conversation (not a form) seeds prefs + memories, then hands off to the first plan. **Skippable** (skip-to-app first-class → sensible defaults, chef learns as you go). Completing it writes `user_preferences` + ≥1 `sourceType:'onboarding'` memory and sets an onboarding-complete flag (small additive schema). The first generated plan reflects the answers. **Locked design (1D):** one model per screen — tap answers on top + a bottom "or tell me" **TEXT** field (mic icon shows a "voice coming soon" toast; dictation deferred); **4-question core** (household composition · diet · allergies · **weeknight time**) + an **adaptive opt-in deep round** (planner + tunable stopping threshold); opinionated-cook reflect; hand-off = the **pre-seeded Plan intent modal** (door #3). | 🔨 **BUILT S36.** Both dependencies resolved: (a) household composition = **band counts** `{adults, children, babies, babyStage}` (matches the locked design; Griffin ratified over the brief's age-array note), `householdSize` derived server-side; (b) **stopping policy** = a deterministic tunable planner + eval (`scripts/1e-onboarding-planner-eval.ts`, 6/6 personas). 437 unit green. **E2E OB1–OB8 green (70/70 suite).** ✅ **CLOSED S40** — Griffin's taste pass landed S39 (which deepened the round to 5 questions and rebuilt the reflect playback), and the three gates were re-run from scratch against that build: `/visual-qa` 0 blockers / 0 high, Layer B verified on the real model, `/code-review` done. **480 unit + 78 E2E green, planner eval 7/7.** |
| 5 | **Capture confirmation ("Got it — I'll remember that")** | When the chef captures a preference from an interaction (Talk-to-Chef "I don't eat dairy anymore"; a strong feedback signal), it surfaces a brief, honest confirmation with **undo** and a path to the You audit. Capture is never silent. The captured item then appears in the ledger (#3). | ✅ S33 — undoable bottom toast on every add/remove/capture (gap #2). `user.talk` returns an undo payload → undo reuses existing mutations. E2E Y8 (capture) / Y2/Y5 (undo). |
| 6 | **Blended feedback surfaced (implicit made reviewable)** | Implicit-signal memories (thumbs/behavior, `sourceType:'implicit'`) appear in the ledger (#3) with an honest "I noticed" label and are **dismissible** — dismissing stops them influencing generation. (Reuses #3's mutations + the existing implicit-write path; **no new inference engine** — proactive "here's a pattern I noticed" nudging is deferred, see OUT.) | ✅ S33 — "I noticed" label + dismiss via `memory.deactivate`. E2E Y6. |
| 7 | **E2E coverage for You flows** | Harness extended (`tests/e2e/`): onboarding interview complete + skip paths, a hard-constraint edit round-trip, a memory removal. Suite green (`npm run test:e2e`). A feature isn't done until its mechanics are covered. | 🔶 S33 — first You coverage Y1–Y9 (edits, ledger, capture, new-user); full suite 62 green. Onboarding paths land with #4. |

**Also shipped S33 (not a numbered feature, but the design's hero — Griffin chose Option B):** the **AI capture task**
(`user.talk`): `preferences-talk` prompt (SAFETY block, snapshot-tested) + `[N]`-ref id-safety + pure
`applyPreferencesTalkOps`. **Real-model safety eval 9/9, 0 safety failures.**

**Design coverage:** #2, #3 (the audit surface) → Claude Design pass, 2 directions. #4 (onboarding interview) → fast-follow pass, 1 direction, inheriting the audit vocabulary. #1 → build-direct. #5, #6 → in-pattern (reuse Talk-to-Chef + ledger vocabulary); `/visual-qa` catches drift. See the design plan below + `docs/design/surfaces/you/brief.md`.

---

## Explicitly OUT of 1E scope

| Item | Where it lives | Why deferred |
|------|---------------|--------------|
| Proactive pattern-detection nudges ("You've skipped fish 3 weeks — drop it?") | Backlog (1F / post-MVP) | Needs an inference pass over behavior; #6 ships the *reviewable* version, not a nagging one. Two-way door. |
| Household **sharing** UI / invites / multi-member preference merge | V1.5 (scope-v1 out-of-scope) | Infra (household_id) is in R1; the sharing surface is not. You tab is solo in R1. |
| Recurring **explicit check-in** cadence ("weekly: how'd the week go?") | Backlog | Nagging risk; validate the passive loop first (Nail-Before-Expanding). |
| Memory **confidence/decay tuning**, dedup/merge of near-duplicate memories | Backlog | `confidence` column exists; auto-management is an optimization, not M5. |
| **Notifications / reminders** (plan-day nudges, etc.) | V1.5+ | Not a preferences/memory concern. |
| Visual polish (type scale, spacing, motion consolidation) | 1F design-system pass (decision 2026-07-09) | One system pass beats piecemeal. |
| Data export / account deletion / privacy controls | 1F (production-readiness) | Hardening pass, not the memory loop. |

---

## Design pass plan (design-gated — build waits on this)

Per the design-pass gate (new surface → strong recommendation):
- **Pass 1 (now): You-tab steady-state audit surface — 2 directions.** The open question: how do you render "what your chef knows about you" so it reads as *trust and control*, not a settings form or a DB dump? Contrast the two poles of the OQ#2 tension made visual (a chef's-memory *narrative* read vs. a structured *control panel*). High-value pass.
- **Pass 2 (fast-follow): onboarding interview — 1 direction.** A conversational first-run flow that inherits Pass 1's memory vocabulary. Lower novelty once the audit surface sets the language; design the destination first, then the on-ramp.
- **Build-direct (no pass):** #1 account/household basics; #5/#6 reuse Talk-to-Chef + ledger vocabulary.

Brief: [`docs/design/surfaces/you/brief.md`](design/surfaces/you/brief.md). Loop + round-trip: `docs/design/design-workflow.md`.

---

## Open scope questions (1E)

1. ~~**Onboarding depth**~~ **RESOLVED (S35):** 4-question core (household composition · diet · allergies · weeknight time) + an *adaptive, opt-in deep round* with a value-meter and a one-tap "I'm good for now"; the deep round's stopping threshold is a tunable build task. Design locked (1D).
2. **scope-v1 open Q (carried):** does 1F include a small closed beta beyond Griffin + wife, or is two-user validation enough to ship R1? (scope-v1 parked this decision *for* 1E — decide this phase.)
3. **Ingredient-cache scoping — global vs household** (BUG-004 #3, parked to Phase E in open-questions.md). Not a You-tab feature; decide opportunistically if #3 gets picked up. Not a 1E blocker.

## Scope change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-22 (S32) | Doc created. 1E scoped: 6 build features + E2E. **Open-Question #2 RESOLVED** (AI-first capture / structured audit hybrid, split by data type). Design-gated (2-direction audit pass + 1-direction onboarding fast-follow). | Phase 1E kickoff; the memory loop is the M5 milestone and the product's trust surface |
| 2026-07-22 (S32) | **Design Pass 1 (audit surface) imported** — Direction A (chef's narrative read); covers features #1/#2/#3/#5/#6. #4 (onboarding interview) still needs its Pass-2 design. **Build deferred to a clean Sonnet session.** Inspection gaps logged (edit-via-chat → lean remove+re-tell; no-undo toast; dedup microcopy). | Design in hand; the build is a full new-surface phase-build best done on the intended model with a fresh context budget |
| 2026-07-22 (S33) | **Audit surface BUILT** — #1/#2/#3/#5/#6 ✅ + #7 first You E2E (Y1–Y9) 🔶 + the AI capture task `user.talk` (Griffin chose Option B). All three inspection gaps folded in (dropped `memory.edit`; added undo; softened dedup copy). Deviations logged: direct inline Add (not chat), added an "Eating" field, omitted the decorative mic. Verified: 363 unit + 62 E2E green, real-model safety eval 9/9 (0 safety failures), visual-QA 0 blockers/0 high, code review (no critical; 4 findings fixed). **#4 onboarding still design-gated.** | The build move from S32; the memory loop is the M5 milestone + the product's trust surface, so it gets the full mechanics + safety verification |
| 2026-07-24 (S36) | **#4 BUILT.** Household composition ratified as **band counts** `{adults, children, babies, babyStage}` (locked design over the brief's age-array note; V1.5 extends additively). Griffin reframed the servings question — a baby's *stage* drives it, so a **conditional baby-stage follow-up** was added (a deliberate addition to the locked design, flagged for taste): under 6m → 0 servings, 6-12m → 0 + adapted-portion guidance, 12-24m → counts. Deep-round **stopping policy** built deterministic + tunable with a 6-persona eval (which caught a real flaw: a vegan got a shorter interview than an omnivore; threshold retuned 0.42→0.38). `user.talk` gained a `sourceType` param so interview captures stamp `onboarding`. **Deviation:** the hand-off screen's dinners stepper + lunch/breakfast toggles were NOT built — R1 plans dinners only, and shipping dead toggles is worse than omitting them. **E2E OB1–OB8 green; 70/70 suite.** Along the way: the first-run gate initially redirected every spec to `/welcome` (harness default now stamps the test user onboarded), and BUG-007 turned out to be the harness calling Supabase admin endpoints it never needed (fixed by signing in with the publishable key — `.env.local` was correct). | The last 1E feature; both build dependencies the brief flagged are now resolved, and the two product calls (schema shape, baby servings) were Griffin's |
| 2026-07-25 (S38) | **#4's three closing gates cleared.** `/visual-qa` built the missing onboarding capture harness (14 Layer-A states + a Layer-B live capture) and ran 3 rounds to PASS: the turns never filled the viewport (`min-h-full` was a no-op), the caught tray echoed a sentence instead of itemizing, the reflect hook was generic on the core-only path, and selected allergens were blue. The ux-design-critic pass then **corrected round 1's own fix** — centering moved controls under the user's thumb — so turns are now top/bottom anchored with the confirm's slot reserved. **BUG-005 (app-wide serif) fixed here rather than deferred to 1F**, because a taste pass on chef copy in the wrong typeface is not a taste pass. **Layer B caught a bug the mock could not**: a message about taco night lit the "No restrictions" pill, because the write created the row and `dietary_framework` defaults to omnivore. `/code-review` found a critical regression in the session's own work (a typed correction was overwritten by the tap it corrected) plus nine findings logged as BUG-010…BUG-018. **Two are recommended before the real first run** (BUG-016 silent save failure, BUG-014 lost typed text) because the interview fires exactly once per account. | The phase's DoD item 4 is Griffin's judgement; everything mechanical had to be true first, and the trust surface is the one place a "green but wrong" build is most expensive |
| 2026-07-26 (S39) | **Griffin's taste pass landed, and it added scope rather than closing the phase.** Resolved as built: the baby-stage follow-up stays as-is; the reflect hook loses its categorical opening line; a failed `finishOnboarding` keeps the user on reflect with a live retry. **Added to #4** (Griffin's calls): a **`skill` question** in the deep bank ("How comfortable are you in the kitchen?" — self-rated on purpose; it governs recipe sophistication and how honest a cook time is, which is the one axis that makes a recipe *executable* rather than merely appealing, and neither the core time question nor `effort` covers it); **`goal` raised into reach** because it already carried "Keep costs down" and never got asked, which is where Griffin's cost question lands without singling anyone out; **`effort` kept** (Griffin overruled the proposal to merge it into `skill` — an advanced cook can still be exhausted on a Tuesday) but made **conditional** on a weeknight ceiling above 30 minutes, since "30 minutes, tops" has already answered it. Deep round retuned 4 → **5** questions (`minValue` 0.38 → 0.35, cap 6 as a true backstop), 7/7 personas. **Ingredient reuse became a planner default** rather than a preference — nobody wants a wasted carton, and it shortens the list — so it is a `chef-system.ts` plan rule, not a question. Also: the **plan seed no longer comes back empty on the core-only path** (the most common completion was handing off an empty box), the **value meter can now actually reach full** (it divided by a cap the policy never hit, so the most engaged user possible saw 80%), the reflect hooks were **demoted from naming a plate to naming a technique** (nothing carried "seared salmon" into generation, so the first specific promise the product made was unenforced), and **test mode shipped** (`user.resetOnboarding` + a You-tab card, server-gated by `DEV_TOOLS_EMAILS`) because the interview fires once per account and Griffin cannot otherwise re-test it. **Still open:** the reflect playback is out for a Claude Design pass (`design/surfaces/onboarding/brief-reflect-playback.md`) — the phase closes when that lands and is built. | The taste pass is 1E's DoD item 4 and Griffin owns it; every change here traces to a call he made. The two he added are load-bearing for plan quality rather than polish, and the interview fires exactly once per account, so getting the question set right before the real first run is worth holding the phase open for. |
| 2026-07-26 (S39, cont.) | **Reflect playback BUILT** from the Claude Design pass, and onboarding migrated to **Design Specification v1.0** as pass 1 of three. The reflect screen is now three blocks (opinion alone on the floor / `WHAT I'VE GOT` grouped by kitchen logic / `SO HERE'S YOUR WEEK` as consequences), derived by a new pure `src/lib/onboarding/playback.ts` (16 tests) and scrolling with the CTA on a pinned chrome bar. Depth reads as specificity: empty groups are dropped, deep answers thicken existing groups, and there is no count or meter anywhere on the screen. New: a verbatim quote of what the user typed (`InterviewState.quotedLine`), a subline under the hook, a named-guesses block for a sparse run, and an adults-only hook so skipping stops falling through to the generic line. **`ALREADY CIRCLING` deliberately NOT built** (Griffin) — it names dishes nothing carries into generation, the same unenforced promise the hooks had; the path to making it true is logged. **`safetyFirst` OFF** (Griffin) — the recap stays after the playback. Capture states `ob-reflect-deep` and `ob-reflect-sparse` added so the design's central claim is checkable by looking. Four bugs found by reading the captures and fixed: a stray space before punctuation in every fact, "Fish are what you want to see more of", the subline duplicating the last week decision verbatim, and `talkPending` clearing before the read-back so the confirm was ungated for the tail of a capture. **479 unit + 78 E2E green.** | The reflect screen is where the interview justifies itself, and it was the one part of 1E still reading as a form played back. The design system arriving mid-phase forced the pass split (see scope-v1 S39 row); onboarding went first because Griffin runs the interview for real next and should run the design he locked. |
| 2026-07-26 (S40) | **PHASE CLOSED — M5 met.** The three gates re-run from scratch against the S39 build. **`/visual-qa`:** 22 Layer-A states (onboarding 16 + You 6, incl. two new test-mode states the S39 UI had no coverage for at all) critiqued against **Design Spec v1.0's six laws** rather than the superseded `Guidelines.md`. Two high findings fixed — the mic toast was letting the confirm + skip labels **ghost through it** at the spec's `.94` L5 fill (now opaque), and the You capture was photographing the page **before the `devToolsEnabled` query landed**, which both hid the test-mode card on one state and dropped it under the fixed tab bar on another. **`Layer B`:** six real weeks. The reuse rule works and does **not** cost variety (7/7 distinct proteins and dish forms in every week; one bunch of dill genuinely finished across three different dishes), but it made the model reach for three things it must not say — **"from day 0"** printed straight to the user, **"use spinach fresh from last shopping trip"** invented on a first-ever plan, and reuse over-generalised to **olive oil and lemon**. One clause in `PLAN_OUTPUT_RULES` fixed all three, locked by three new assertions, and round 2 verified them gone on the real model. **`/code-review`:** found that pass 1 of the palette migration warmed the *fills* but left `border-white/10` on **every unselected chip and card in the interview** — the exact cool white law 04 forbids, on the surface designated as the worked example for passes 2 and 3. Fixed. Two real defects logged rather than fixed at the gate (**BUG-020** in-flight saves can be reported as "All saved.", **BUG-021** a failed skip still walks the user out). | The gates were not a formality this time: S39 rebuilt the reflect screen, changed the most consequential prompt in the product, and migrated a palette, so every S38 clearance was stale. Layer B in particular earned its keep — all three of its findings are invisible to the mock by construction, and two of them would have shipped into Griffin's one real first run. |
| 2026-07-24 (S35) | **#4 onboarding interview design LOCKED — direction 1D "Talk it through"** (Claude Design, iterated with Griffin over multiple passes). One-model-per-screen (tap answers on top + a bottom "or tell me" field); **R1 field is TEXT — mic icon shows a "voice coming soon" toast** (dictation deferred, out of R1 per open-questions S35). **4-question core** (household composition · diet · allergies · **weeknight time — now core, not optional**) + an **adaptive opt-in deep round** (planner + tunable stopping threshold = a build task w/ eval). Hand-off = the **pre-seeded Plan intent modal** (door #3), not a bespoke screen. Opinionated-cook reflect; reduced-motion honored. **New build dependency:** adaptive **household-composition schema** (per-member ages → prep/texture/portion/safety) needs an `/architect` pass; full per-member *preference* profiles deferred to V1.5 (Family Member Profiles). **Palette (amber+blue) deferred to 1F.** Build spec: `design/surfaces/onboarding/brief.md`. | Griffin ran the Claude Design pass, converged on 1D, and made the field / cook-time / household-schema calls; recording the lock so the build target is unambiguous |
