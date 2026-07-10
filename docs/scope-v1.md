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

- [ ] All six phases below at their milestone
- [ ] North-star flow validated: Griffin + wife each run the full weekly ritual on prod for **2 consecutive real weeks** (solo accounts)
- [ ] Time-to-list measured < 10 minutes on a real week
- [ ] E2E suite green across Plan, Recipes, AND Groceries tabs
- [ ] Production deployed, stable, no P0/P1 known bugs

---

## Phase spine (1A–1F)

*Milestones M3–M6 reconstructed from Session-9 skeleton (original plan file lost — see plans/README.md).*

| Phase | Scope (one line) | Milestone | Status | Dates | Detail |
|-------|-----------------|-----------|--------|-------|--------|
| **1A** Foundation | Scaffold, schema+RLS, auth, tab shell, deploy | M1: deployed app, login, tabs, DB writes | ✅ | 2026-05-27 (1 day) | [changelog S10](changelog.md) |
| **1B** AI Core + Recipes | AI service layer, chef prompt, recipe pipelines + tab | M2: generate/import/modify/browse end-to-end | ✅ | 2026-05-27 (1 day) | [changelog S11](changelog.md) |
| **1C** Plan Tab | The signature "AI generates your week" experience | M3: full plan loop — generate→review→confirm→modify→wrap | ✅ | 2026-07-06 → 07-10 | [scope-1C.md](scope-1C.md) |
| **1D** Groceries | Plan → merged, shoppable list | M4: plan produces a usable grocery list | 🔨 next — needs planning pass | 2026-07-10 → | scope doc at phase start |
| **1E** You Tab + Memory | Onboarding interview, preferences audit, memory loops | M5: chef knows you; preferences editable | ⬜ | — | scope doc at phase start |
| **1F** Polish / Production Readiness | Design-system pass, observability, hardening | M6: MVP ship | ⬜ | — | scope doc at phase start |

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

### 1D Groceries ⬜
- [ ] Auto-generate list from confirmed plan
- [ ] AI ingredient merging/normalization ("2 cups + 1 cup chicken broth = 3 cups" — the hard V1 problem)
- [ ] Free-form manual add (type anything) + non-food household items
- [ ] Check-off interface for in-store use
- [ ] Category grouping (produce, dairy, meat, pantry, frozen, household)
- [ ] "Staples" recurring-items list
- [ ] Export to clipboard (plain-text fallback)
- [ ] Carry-ins: resolve free-form vs structured entry (open-questions #1); recipe.get null-vs-NOT_FOUND consistency; extend E2E harness to Groceries

### 1E You Tab + Memory ⬜
- [ ] AI-guided onboarding interview (conversational, not forms)
- [ ] Preferences: dietary framework, "no list," household size, cook time, cuisines
- [ ] Memory capture from interactions + "Got it — I'll remember that" confirmations
- [ ] Preferences audit view (You tab) — verification surface, not primary editor
- [ ] Blended feedback: implicit signals + lightweight explicit check-ins
- [ ] Carry-in: resolve AI-first vs static settings (open-questions #2); extend E2E to You flows

### 1F Polish / Production Readiness ⬜
- [ ] THE design-system pass (2026-07-09 decision: one system exercise — type scale, spacing, motion, component library) + polish backlog burn-down
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
