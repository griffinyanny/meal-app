# Release 1 Scope — "The 10-Minute Weekly Ritual" (solo-user MVP)

> **What this document is.** The scope contract for the first release. Opened (linked)
> at the start of every session. Griffin owns it; Claude builds against it.
> **Doc lineage:** master plan (`~/.claude/plans/purrfect-hatching-ladybug.md`, V1–V4
> strategy) → [roadmap.md](roadmap.md) (releases) → **THIS DOC** (Release 1) →
> `scope-<phase>.md` (active phase detail) → [whats-next.md](whats-next.md) (session state).
>
> **Update cadence:** this doc changes on status flips, scope changes, and DoD progress —
> NOT every session. Phase docs carry the churn. Griffin can edit checkboxes/comments
> directly (Claude picks them up at session start), but the primary channel is telling
> Claude, who applies the edit.

**Created:** 2026-07-10 (Session 19) · **Boundary decided:** solo-user MVP (see decisions.md 2026-07-10)

---

## The release

**North star:** "I have no idea what to cook" → "My grocery list is ready" in **under 10 minutes**.

Release 1 = the full solo loop: capture/generate recipes → AI-proposed weekly plan →
auto-generated grocery list → preferences/memory that make week 12 better than week 1.
Household **infrastructure** ships (every table is household-scoped); household sharing
**UI**, realtime sync, and cook mode are V1.5 (Session 9 decision, confirmed Session 19).

**Success metrics** (from the master plan): time-to-grocery-list < 10 min · weekly
retention (Griffin + wife actually run the ritual) · recipe library growth · AI
interaction rate · list quality.

## Definition of done — Release 1

- [ ] All phases below (1A–1F, including the **1E.7** and **1E.5** interstitials) at their milestone
- [ ] North-star flow validated: Griffin + wife each run the full weekly ritual on prod for **2 consecutive real weeks** (solo accounts)
- [ ] Time-to-list measured < 10 minutes on a real week
- [ ] E2E suite green across Plan, Recipes, AND Groceries tabs
- [ ] Production deployed, stable, no P0/P1 known bugs

---

## Phase spine (1A–1F, + the 1E.7 and 1E.5 interstitials)

*Milestones M3–M6 reconstructed from Session-9 skeleton (original plan file lost — see plans/README.md).*

| Phase | Scope (one line) | Milestone | Status | Dates | Detail |
|-------|-----------------|-----------|--------|-------|--------|
| **1A** Foundation | Scaffold, schema+RLS, auth, tab shell, deploy | M1: deployed app, login, tabs, DB writes | ✅ | 2026-05-27 (1 day) | [changelog S10](changelog.md) |
| **1B** AI Core + Recipes | AI service layer, chef prompt, recipe pipelines + tab | M2: generate/import/modify/browse end-to-end | ✅ | 2026-05-27 (1 day) | [changelog S11](changelog.md) |
| **1C** Plan Tab | The signature "AI generates your week" experience | M3: full plan loop — generate→review→confirm→modify→wrap | ✅ | 2026-07-06 → 07-10 | [scope-1C.md](scope-1C.md) |
| **1D** Groceries | Plan → merged, shoppable list | M4: plan produces a usable grocery list | ✅ | 2026-07-10 → 07-21 | [scope-1D.md](scope-1D.md) |
| **1E** You Tab + Memory | Onboarding interview, preferences audit, memory loops | M5: chef knows you; preferences editable | 🔨 | 2026-07-22 (S32–S33) | [scope-1E.md](scope-1E.md) |
| **1E.7** Design-system sweep (mechanical) | Apply **Design Specification v1.0** (theme 11i, `docs/design/system/design-spec.dc.html`) app-wide, mechanical items only: warm every cool-white alpha, normalise the ambient wash to the three named recipes, regularise radii to the eight-rung scale. **Must ship before 1E.5** — see the change log for why. | M5.7: one palette across the app | ⬜ | — | spec §12 migration table, items 01/02/06 |
| **1E.5** Plan Design Buildout | Full **all-states** Plan-tab rebuild in Claude Design → code — the one core surface never mocked in the design system-of-record (Plan was designed in Figma + built in code; Recipes/Groceries were built in Claude Design). **Must ship before 1F.** | M5.5: Plan matches the Groceries/Recipes design fidelity, every state accounted for | ⬜ | — | scope doc at phase start |
| **1F** Polish / Production Readiness (**after 1E.5**) | Design-system pass, observability, hardening | M6: MVP ship | ⬜ | — | scope doc at phase start |

*Pace note: 1A+1B took 2 days. The 2026-05-28 → 2026-07-06 gap was life, not build. 1C
spent Sessions 15–17 building the E2E harness + review infrastructure (deliberate,
reusable for 1D–1F). Dates exist so pace is visible, not a feeling.*

## Per-phase feature checklists

### 1A Foundation ✅
- [x] Next.js + tRPC + Drizzle + Supabase scaffold, phone-form-factor shell, 4-tab nav
- [x] 11-table household-scoped schema + RLS on every table
- [x] Auth (Google SSO), auto-onboarding (`ensureOnboarded`), Vercel deploy

### 1B AI Core + Recipes ✅
- [x] Provider-agnostic AI layer (AI SDK v6): `generateStructured`/`generateText`/`generateStream`
- [x] Personal-chef system prompt (role + safety + output rules, injection-hardened)
- [x] Recipe pipelines: generation, URL import (SSRF-protected + Jina fallback), modification w/ version chains
- [x] Recipes tab: library, search, generate/import dialogs, detail w/ modify/favorite/delete
- [x] AI memory core (pulled forward from 1E): `getChefContext`/`writeMemory`

### 1C Plan Tab ✅ — detail + acceptance criteria in [scope-1C.md](scope-1C.md)
- [x] Items 1–11: intent capture, streaming, review/confirm, cards, sheets, chef chat, modify affordance, regenerate, mid-week, week-wrapped, feedback→memory (machine-verified, 30 E2E green)
- [x] Item 12: chip/action quality — verified S19 on real model (100% imperative chips)
- [x] Item 13: generation variety — verified S19 (7/7 distinct dish forms)
- [x] Griffin's feedback pass complete (batch 1, S18)

### 1D Groceries ✅ (closed S28 — 2026-07-21; shipped to prod)
- [x] Auto-generate list from confirmed plan
- [x] AI ingredient merging/normalization ("2 cups + 1 cup chicken broth = 3 cups" — the hard V1 problem). **Merge quality verified on the real model (soft DoD #2), Griffin signed off: exact sums, scallions==green-onion canonicalization, zero mis-merges.**
- [x] Free-form manual add (type anything) + non-food household items
- [x] Check-off interface for in-store use (one-zone GOT IT)
- [x] Category grouping (produce, dairy, meat, pantry, frozen, household) + grouped↔manual reorder
- [x] "Staples" recurring-items list (chip row, offered not auto-added)
- [x] Export to clipboard (plain-text fallback)
- [x] Carry-ins: free-form entry resolved (open-questions #1); recipe.get null-vs-NOT_FOUND consistency; E2E harness extended to Groceries (GR1–GR11) + Recipes (RC1–RC10); Talk-to-Chef NL→ops; Recipes-tab reorg; visual-QA capture harness extended to Groceries + Recipes
- ⏭ **Fast-follows:** generation-architecture rethink (BUG-004) ✅ shipped S30; buy-unit/merge-consolidation (BUG-002) + quick-add category (BUG-001) ✅ shipped S31; mid-week resync + bespoke empty/error states still deferred by scope

### 1E You Tab + Memory 🔨 (audit surface built S33; only onboarding interview remains) — detail in [scope-1E.md](scope-1E.md)
- [ ] AI-guided onboarding interview (conversational, not forms) — **design-gated (Pass-2 not yet designed)**
- [x] Preferences: dietary framework, "no list," household size, cook time, cuisines — **direct-editable audit surface (S33)**
- [x] Memory capture from interactions + "Got it — I'll remember that" confirmations — **`user.talk` AI capture + undoable toasts (S33); real-model safety eval 9/9**
- [x] Preferences audit view (You tab) — verification surface, not primary editor — **built to imported Direction A (S33)**
- [x] Blended feedback: implicit signals surfaced ("I noticed") + dismissible (S33). *(Lightweight explicit check-ins deferred → 1F/backlog.)*
- [x] Carry-in: AI-first vs static settings resolved (OQ#2 — hybrid); **first You E2E (Y1–Y9), 62 suite green**

### 1E.5 Plan Design Buildout ⬜ (interstitial — **must ship before 1F**)
*Why it exists:* Plan is the signature surface but the only core tab **never rebuilt in the Claude Design system-of-record** — it was designed in Figma (the original State-1…State-6 briefs) and hand-built in code, while Recipes + Groceries were designed in Claude Design and imported. So there is no all-states Plan mock to hold the 1F design-system pass to. **Design Plan first, then 1F polishes against it.**
- [ ] Sophisticated all-states Claude Design brief for Plan (Griffin's explicit ask) — enumerate + design **every** state: intent (empty + the onboarding pre-seeded entry, see `design/surfaces/onboarding/brief.md`), streaming/generating, review (draft), confirmed, mid-week, week-wrapped/elapsed, modify working/ack/error, expanded meal sheet, Talk-to-Chef, error/offline
- [ ] Design pass run (Griffin) → import the chosen direction → rebuild Plan in real components to the new fidelity
- [ ] Mine the original Figma `docs/design/brief-plan-states.md` so no existing state is dropped
- [ ] `/visual-qa` + E2E still green across all Plan states; no regression in the shipped mechanics
- [ ] **S35 design inputs to fold into the brief** (from idea-backlog): the summary-vs-full expanded meal sheet (**BUG-006**), a **chef proactive-clarification state** (the never-built S8 "tertiary clarification" slot), explicit **which-day-does-each-meal-land** assignment + going-out nights, and **move-a-meal / drag-drop** affordances. The dynamism cluster is Griffin's biggest ask for this surface — the brief must account for these states, not just the happy path.
- *Supersedes* the idea-backlog `[1F] Visual refresh: Plan to Groceries fidelity` line (S25) — that assumed a polish pass; this is the from-scratch all-states buildout it becomes.

### 1E.7 Design-system sweep ⬜ (mechanical, **before 1E.5**)
*Why it exists:* the design system arrived as a finished specification in S39, mid-1E, rather than being
authored during 1F as planned. Its migration table splits cleanly into mechanical items and real UI changes,
and the mechanical half is worth doing immediately: **1E.5 rebuilds Plan from scratch**, and building the
signature surface against a palette we have already retired means building it twice.
- [ ] **01** Every `rgba(255,255,255,x)` → `rgba(240,222,190,x)` at the same alpha (spec law 04). The spec calls this the biggest single visual win and it is mechanical.
- [ ] **02** Ambient wash normalised to the three named recipes (`.spec-light-ambient` / `-hero` / `-flat`, already in globals.css)
- [ ] **06** Radii to the eight-rung scale (7/9/12/14/16/18/22/46)
- [ ] Every surface adopts the `--spec-*` tokens + elevation utilities added in S39; the pre-spec `:root` family retires
- [ ] `/visual-qa` re-capture of all five surfaces; no regression
- *Onboarding was migrated in S39 as pass 1 of this work and is the worked example.*

### 1F Polish / Production Readiness ⬜
- [ ] THE design-system pass — **now the surface-specific half of the spec migration** plus type scale, motion, and component-library consolidation. Spec §12 items **03** (retire the indigo draft pill + iOS green → `#9CB86F`), **04** (collapse the double bottom bar: delete the floating search pill and FAB, search into the header, one floating primary action, square the nav's top corners — this also fixes the phone-density complaint from S28), **05** (44px hit targets on every icon-only control), **07** (promote faked subsection headings to the real Group/Row title levels). Each wants its own `/visual-qa` pass, which is why they are here and not in 1E.7. **Plan's all-states design + rebuild lands in 1E.5 first** — 1F polishes the whole system on top of it, it does not re-design Plan.
- [ ] Consolidate the four freeform-input controls into the single spec §09 control (onboarding done S39; You, Groceries, and the chef sheet remain)
- [ ] Ship R1 as an installable PWA (manifest, service worker, offline shell, home-screen icon set, install prompt) — validated on Griffin's + wife's phones. Rides with the design pass; native mobile stays held (decision 2026-07-24, see decisions.md)
- [ ] Observability: PostHog (event taxonomy from S9) + Sentry
- [ ] Security review of the full surface; rate limiting audit
- [ ] Performance/a11y pass; error-state sweep
- [ ] Full E2E suite green across all tabs; ship checklist

---

## Explicitly OUT of Release 1

| Item | Destination | Note |
|------|------------|------|
| Household sharing UI + invites | V1.5 | Infra (household_id everywhere) IS in R1 — S9 decision |
| Realtime sync (Supabase Realtime) | V1.5 | Ships with sharing |
| Cook mode (step-by-step overlay) | V1.5 | Data model supports it |
| Pantry (light mode, "what can I make?") | V1.5 | |
| Grocery ordering (Kroger/Instacart) | V2 | |
| Photo/social recipe import | V2 | URL import IS in R1 (shipped, 1B) |
| Nutrition/macros, health coaching | V3 | |
| Native iOS/Android | V4 | |
| Food photography on cards | Polish backlog / V1.5 | Image economics unsolved (2026-05 decision) |
| 1C deferrals: structural action model, move-a-meal, option cards, voice, cost estimates | idea-backlog.md | See scope-1C.md out-of-scope table |

## After MVP — the gate, and what's next

**The gate out of R1** = the Definition of Done above. When those boxes are checked, R1
is shipped and we formally start V1.5 planning (new scope-v1.5.md, master-plan refresh —
phase-boundary protocol).

**V1.5 preview** ("Know What You Have" + the household): light pantry (binary
have/don't), "what can I make?", household sharing UI + realtime, cook mode. Full
picture: [roadmap.md](roadmap.md) + master plan.

**Pull-forward rule:** anything marked V1.5+ can be pulled into R1 only via a change-log
line here (a decision, not drift). Same for pushing R1 items out.

## Open release-scope questions

1. Does 1F include a small closed beta beyond Griffin + wife, or is two-user validation enough to ship R1? (Decide during 1E.)

## Change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-10 | Doc created (S19). R1 boundary = solo-user MVP; S9 cuts (sharing UI, realtime, cook mode → V1.5) confirmed by Griffin. | Release-level visibility ask; reconciles master-plan text vs actual build scope |
| 2026-07-10 (S19) | 1C → ✅ complete (2 of 6 → 3 of 6 phases done); 1D → next | All 13 1C items met; chip/variety quality verified on real model |
| 2026-07-13 (S20) | Claude Design adopted as default design partner (replaces Figma Make); design-pass gate added to the workflow | Design system lives in code → Claude Design reads it directly; 1D Groceries is the first trial. See decisions.md + `docs/design/design-workflow.md` |
| 2026-07-19 (S21) | 1D kicked off: ingredient-merge architecture decided (expand-then-hybrid-merge); `scope-1D.md` + Groceries design brief landed; 1D → 🔨 building | Planning pass (same exercise that made 1C legible); settle the hard V1 problem's architecture before building |
| 2026-07-20 (S22) | 1D **reconciled** with a pre-existing locked plan (forgotten at S21): **plan-time hydration** supersedes confirm-time; adopted the projection model + the imported Claude Design (inline merge-review, Grouped/manual reorder, Talk-to-Chef sheet, one-zone check-off); **trimmed** mid-week resync + bespoke empty/error + `mergeOverrides` out of 1D. Authoritative plan: `~/.claude/plans/rippling-herding-glacier.md`. | Griffin surfaced the older, more-thorough plan (architect + design-critic consulted) and had completed the Groceries design in Claude Design |
| 2026-07-21 (S28) | **1D → ✅ complete (4 of 6 phases done); shipped to prod.** Wrap: code review (3 fixes), **merge quality PASSED the real-model soft DoD** (Griffin's eye), `/visual-qa` capture harness extended to Groceries + Recipes (gate passed), 60s normalize stopgap. **Next: generation-architecture rethink** (a planning session — cut perceived list-gen latency; BUG-004). New: a parked-bug tracker (`docs/bug-tracker.md`). | All in-scope 1D features met + machine-verified; the one soft gate (merge on a real week) cleared; the slow-generation risk is stopgapped + scheduled as the next focus |
| 2026-07-22 (S31) | 1D fast-follows **BUG-002** (buy-unit merge consolidation) + **BUG-001** (quick-add category) closed + shipped; both 300-line-rule splits done. No phase-status change (fast-follow, still 4 of 6). **Next: Phase 1E.** | Cleared the two parked Groceries bugs + tech-debt splits before opening the next surface |
| 2026-07-22 (S33) | **1E You audit surface built + verified** (→ 🔨): features #1/#2/#3/#5/#6 + AI capture (`user.talk`) + first You E2E; real-model safety eval 9/9, visual-QA + code review passed. Phase stays open — **only #4 (onboarding interview) remains, design-gated.** 5 of 6 phases in flight. | The memory loop is M5 + the trust surface; built to the imported Direction A with full mechanics + safety verification |
| 2026-07-24 (S34) | **New phase 1E.5 "Plan Design Buildout" formalized into the spine** (Griffin ratified), between 1E and 1F: a full **all-states** Plan-tab rebuild in Claude Design → code. Plan was designed in Figma + built in code but never mocked in the Claude Design system-of-record like Recipes/Groceries. It **must ship before 1F** (1F's design-system pass polishes on top of it, doesn't re-design Plan). Decimal label chosen over renumbering to keep 1F's identity + its many `[1F]` doc references intact. Brief not yet written — comes after the 1E onboarding interview locks. Same session: wrote the Pass-2 onboarding-interview design brief (`surfaces/onboarding/brief.md`); no build. | The Plan-mock gap is real: every other core surface has a Claude Design all-states source of truth, and ordering it before 1F prevents polishing a surface that was never properly designed in the current system |
| 2026-07-24 | **PWA folded into 1F** (installable home-screen app, ships with the design-system pass); **native iOS/Android held** pending a real capability (push/camera), validation, or distribution trigger. | Current app is already a phone-form-factor web app; native = a full UI rewrite (backend ports via API-first, UI doesn't). Nail the still-unvalidated interaction in the faster web loop first; PWA delivers "app on the home screen" for ~1 slice. |
| 2026-07-26 (S39) | **Design Specification v1.0 landed mid-phase, and the migration was split into three passes** (Griffin ratified). Griffin authored a full design system in Claude Design ("Gold voice, cream hand", theme 11i) whose §12 lists concrete deltas against the build. Rather than absorb it all now or defer it all to 1F: **pass 1 (S39)** migrated the onboarding flow, because Griffin runs the interview for real next and should run the design he just locked; **pass 2 = the new 1E.7**, the mechanical app-wide items, ordered **before 1E.5**; **pass 3 = 1F**, the surface-specific changes plus the type/motion/component work. Also this session: the 1E deep round gained `skill` and reachable `goal` (cost), ingredient reuse became a planner default, and test mode shipped. | The ordering is the load-bearing part: **1E.5 rebuilds Plan from scratch**, so applying the mechanical sweep first is the difference between building the signature surface once and building it twice. Splitting mechanical from surface-specific keeps 1F's per-surface `/visual-qa` discipline intact instead of turning one sweep into an unreviewable diff. Accepted cost: onboarding looks different from the rest of the app until 1E.7 lands. |
| 2026-07-24 (S35) | Griffin brain-dump filed across the tracking docs; **1E.5 gains S35 design inputs** (summary-vs-full meal sheet [BUG-006], chef-clarification state, per-day meal assignment, move/drag) to fold into the Plan brief when it's written. No phase-status change. | Capture pass — route each idea to the doc where it resurfaces at the right phase; keep the 1E.5 brief honest to Griffin's dynamism asks |
