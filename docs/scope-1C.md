# Phase 1C Scope — Plan Tab

> **What this document is.** The phase-level scope contract: in-scope features with
> acceptance criteria, explicit deferrals, and a change log. The release-level view
> lives in [scope-v1.md](scope-v1.md) (the hub — start there); this doc is its 1C
> spoke and carries the detail/churn. Session ritual: see CLAUDE.md → Session Protocol.
> Griffin owns scope; Claude builds against it — nothing gets built that isn't in a
> scope doc, and scope changes land as change-log lines, not drift.

**Created:** 2026-07-10 (Session 18) · **Milestone:** Phase 1C, part of V1 "The 10-Minute Weekly Ritual"
**Phase status:** Build complete (S16) + machine-verified (S17) → now in Griffin's feedback/taste pass (S18–)

---

## Milestone goal

The Plan tab delivers the **weekly ritual**: open the app → review an AI-proposed week →
adjust it conversationally → confirm → live with it mid-week → close it out → plan the
next one. "AI generates the UI" has to feel real here — this screen is the product bet.

**Definition of done for 1C:**
1. Every in-scope feature below meets its acceptance criteria (machine-verified where mechanical).
2. Griffin's taste pass finds no bug/quality items left unfixed (product items may be logged + deferred).
3. AI output quality (chips, variety, titles) is good enough that the proposal feels like a chef, not a template. *(The soft criterion — Griffin judges.)*

---

## In scope — with acceptance criteria

Status: ✅ shipped & E2E-verified · 🔶 shipped, quality iteration open · ⬜ not built

| # | Feature | Acceptance criteria | Status |
|---|---------|--------------------|--------|
| 1 | **Intent capture / no-plan state** | Empty state leads with "What are you thinking this week?" + suggestion pills + free-text + "let your chef figure it out." Never a blank calendar. | ✅ (G1–G3) |
| 2 | **Streaming generation** | Plan streams in card-by-card (skeleton → filled). Error → "chef got stuck" + working retry. No static spinner. | ✅ (G1, G4) |
| 3 | **Review & confirm** | Hero: chef summary + "N dinners · ~M ingredients" + "Looks good →" + "Talk to the Chef." Sticky confirm bar when hero scrolls off. Confirm persists. | ✅ (R1–R3) |
| 4 | **Per-meal cards** | Day label, title, chef rationale, meta row, 2 contextual chips. Whole card tappable. Eating-out/skip days render de-emphasized. | ✅ (R3, M7) |
| 5 | **Expanded meal sheet** | Tap card → sheet: full concept + ingredient pills + AI action chips + swap + "Something else? Tell your chef" (scoped). | ✅ (D1–D7, M2) |
| 6 | **Talk to the Chef (whole-week + scoped)** | Free-text modify from hero (whole-week) or meal (scoped — changes ONLY that day). Suggestion pills. | ✅ (M3, M4) |
| 7 | **Modify affordance** | Every modify shows pending where the user is looking (in-place card / open sheet), lands with a highlight, whole-week changes narrate via bottom ack pill. No top toast, never silent. Single active modify. | ✅ (M1–M7, X1–X2) |
| 8 | **Regenerate / plan next week** | "Start over →" / "Plan a new week →" routes through intent screen; replace-warning on confirmed plans; "← Keep current plan" escape; one-active-plan. | ✅ (RG1–RG5) |
| 9 | **Mid-week state** | Confirmed + days elapsed → tonight highlighted, "EARLIER THIS WEEK" with thumbs, "COMING UP," chef link. | ✅ (W1) |
| 10 | **Week wrapped / elapsed state** | All days past → recap + thumbs ("that's a wrap") or stale-draft variant; "Plan next week →." Never the nonsensical mid-week view. | ✅ (E1–E4) |
| 11 | **Feedback → chef memory** | Thumbs on past meals persist and feed generation context. | ✅ (E2) |
| 12 | **Chip/action quality** | Chips are verb-first imperative ACTIONS someone would actually tap ("Make it spicier"), never bare attributes ("light", "iron-rich"), never a quality the dish already has. Modify never bolts request wording onto titles. | 🔶 prompt hardened S18 — verify on fresh generations |
| 13 | **Generation variety** | A generated week varies protein, cuisine, AND dish form. (S18 counterexample: 7× "Grilled ___ Salad.") | 🔶 open — prompt/model iteration |

**E2E coverage:** 30 specs green (`npm run test:e2e`); catalog in `docs/test-plan.md`. Items 12–13 are AI-output quality — verified by fresh generations + Griffin's eye, not E2E (the harness mocks the model).

---

## Explicitly OUT of 1C scope

| Item | Where it lives | Why deferred |
|------|---------------|--------------|
| Expanded-card structural actions (move day / servings / cook now / grocery) | Backlog (S18) — needs product/design decision | Real interaction-model expansion; parts gated on 1D + Cook Mode |
| Move-a-meal-to-another-day (incl. drag-and-drop) | Backlog (S18) | Griffin deferred explicitly |
| Cook Mode / "Start cooking →" | Backlog (V1.5 candidate, roadmap says post-V1) | Whole feature, not a Plan-tab patch |
| Structured clarification option cards (dinner-party flow, Figma State 4) | Backlog (unphased) | The "tertiary 10%" interaction; V1 ships without it |
| Food photography on cards/sheets | Backlog "cost-effective food imagery" + decision 2026-05 | Image economics unsolved; deliberate |
| Cost estimates ("~$87") | Backlog (V3-ish) | Needs pricing data we don't have |
| "Add to grocery list" action | Phase 1D | Groceries tab doesn't exist yet |
| Voice dictation / mic | Backlog (unphased) | Web-first V1; revisit with native |
| "Why this week?" reasoning sheet, rotating placeholders, history hooks | Backlog (unphased) | Nice-to-haves; not ritual-critical |
| Visual polish (type scale, spacing, motion, sticky-bar aesthetics) | Post-V1 design-system pass (decision 2026-07-09) | One system pass beats piecemeal |

---

## Open scope questions

1. **Does item 12/13 quality gate 1C exit?** Recommendation: yes for chips (12 — it's the "AI feels like a chef" bet), no for variety (13 — track it, iterate through 1D).
2. **Talk-to-Chef pills auto-send on tap** (backlog, S15) — small, in the spirit of item 6. Pull into 1C or defer?

## Scope change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-10 | Doc created (S18); items 12–13 added to scope as quality criteria | Griffin's feedback pass surfaced chip/variety quality as blocking the "feels right" bar |
| 2026-07-10 | Structural action model + move-day explicitly moved OUT (were implicit in Figma State 5) | Griffin deferred; needs its own design pass |
