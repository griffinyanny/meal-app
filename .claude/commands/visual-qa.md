---
description: Visual QA — capture every Plan-tab state, look at the pixels, critique + fix, then hand to Griffin for taste
---

$ARGUMENTS

You are running the visual QA loop: drive the app to each UI state, **look at the actual screenshots** (you read images natively), critique them against the rubric, fix what fails, and iterate — so the UI is polished BEFORE Griffin reviews. This catches "the code says one thing, the screen shows another," which DOM/behavior tests miss.

Grounding: read `docs/design/visual-qa-rubric.md` (the rubric) and **`docs/design/system/design-spec.dc.html`** — Design Specification v1.0, theme 11i, canonical since S39 — as the visual system. Judge against **its six laws**. `docs/design/Guidelines.md` is SUPERSEDED: read it for the anti-pattern list only and ignore its colour values entirely (it still names the retired `#0E0E10` floor and `#3A86FF` accent). `docs/design/PROJECT-CONTEXT.md` carries the current build state, including which items are still deliberately un-migrated. Full design in `~/.claude/plans/*` (visual QA plan) and `tests/e2e/capture/`.

## Two layers
- **Layer A (mock, free, deterministic)** — `npx playwright test -c playwright.capture.config.ts` (add `E2E_REUSE_BUILD=1` if the app build is current). Placeholder content → judges LAYOUT / rendering / design-system / right-state-showing. NOT content quality.
- **Layer B (real model, ~pennies of OpenAI, nondeterministic)** — `E2E_LIVE_CAPTURE=1 E2E_REUSE_BUILD=1 npx playwright test -c playwright.capture-live.config.ts`. Real generated content → judges variety, chip phrasing (imperatives vs adjectives), real-string layout. Run this when content quality is in question or before a milestone.

## The loop
1. **Capture.** Run the relevant layer (A always; B when content matters). Each run writes `tests/e2e/captures/<ts>/` with `manifest.json` + PNGs. Find the dir from the `CAPTURE_DIR=` line or `tests/e2e/captures/.last-run`.
2. **Critique.** Read `manifest.json`. For each state, `Read` its PNG and grade the four rubric sections — **Correctness** (verify each `facts`/`observed` entry is visibly true — this anchors you against hallucination), **Design-system** (the binary checklist; honor the all-caps-eyebrow exception), **Layout** (truncation/overflow/overlap/void/touch-targets), **Improvement** (ranked, non-gating). Any `captureStatus !== "ok"` is itself a bug signal.
3. **Report.** Write `critique.md` into the run dir: per-state findings `{severity, section, issue, where}` + a summary `{blockers, high, medium, polish, gate}`.
4. **Fix + re-capture.** Fix blockers/high (and cheap mediums), re-run capture for the affected states, re-critique. Cap at **3 rounds**.
5. **Gate.** Hand to Griffin at **0 blockers + 0 high**. If a finding is a real *product/taste* question (not a bug), do NOT force it green — note it and raise it with Griffin.
6. **Taste pass.** When the gate passes, launch the `ux-design-critic` subagent once on the final PNGs + rubric section (d) for a specialist polish read. Apply its high-value findings, re-capture, then hand over.
7. **Hand to Griffin** for TASTE only (does it read well, do chips sound like actions, does it feel right) — with the residue/polish list. Log a one-line summary to `docs/changelog.md`.

## Notes
- Distinguish **capture bugs** (screenshot artifacts — e.g. a shot taken mid-load, a fixed element stitched wrong) from **app bugs**; fix capture bugs in `tests/e2e/capture/capture-runtime.ts`, not the app.
- Layer A content is fake — never judge content *quality* from it (that's Layer B).
- Viewport is 390px (briefs assume 430) — don't penalize width-driven proportion differences.
- Captures are gitignored (regenerable). The durable record is `critique.md` findings → changelog/backlog.
