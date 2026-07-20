# Groceries (Phase 1D) — AS-BUILT design record

> **This is not a to-generate brief — the design is DONE.** Griffin designed the Groceries tab in Claude
> Design and it's imported. This file is the durable record of what was built + the decisions baked into
> the build. The 1D-kickoff version of this file (a generate-brief with OPEN questions) is superseded;
> those questions are now resolved (below). Loop + round-trip mechanics: `../../design-workflow.md`.

## Design pointer (the durable, re-fetchable reference)
- **Claude Design URL:** `https://claude.ai/design/p/8bc73bfa-9683-4b44-ab06-40da9ec78590?file=Groceries.dc.html`
- **projectId:** `8bc73bfa-9683-4b44-ab06-40da9ec78590` · **file:** `Groceries.dc.html`
- **Re-fetch anytime:** `DesignSync.get_file("8bc73bfa-9683-4b44-ab06-40da9ec78590", "Groceries.dc.html")`
- **As-built snapshot:** [`imported.dc.html`](imported.dc.html) (saved 2026-07-20). Illustrative inline-styled
  markup with `<sc-for>`/`<sc-if>` + `{{ }}` placeholders — **build the LAYOUT, not the demo numbers.**
  Never paste it into the build.

## What it is
The Groceries tab — the payoff of the north-star loop. A confirmed week projects into a merged, shoppable
list. The design inherits our system cleanly (dark glass, `glass-card` rows, eyebrow section headers, glass
tab bar, bottom sheets, accent `#3A86FF`). Categories match our schema enum exactly. Text-forward, dark-only,
430px phone. Register: chef-voice header states the value ("I combined 6 ingredients across your 6 dinners"),
brief, no celebration beyond a quiet "List complete" line.

## States as-built
- **Building / generating** — "Pulling together your list · from your N dinners" + phase step-list + shimmer
  + skeleton rows (reuse Plan's `.shimmer-bar`). Skipped if already ready.
- **The list (ready)** — eyebrow "GROCERIES · THIS WEEK" + "Your list" + `checked/total` + progress bar;
  category sections (glass rows); each row = checkbox · name (amber dot iff quantity is fuzzy) · optional
  meta · tappable qty (right) · expand-chevron. Inline name/qty editing.
- **Merge-review (inline)** — the expand-chevron opens a per-meal breakdown + "Split into separate items".
  No banner, no strip, no overlay. (The prototype's `b` review-pass and `c` double-check-strip toggles were
  explored and **rejected**.)
- **Organize toggle** — Grouped (category/aisle sections, headers drag-reorderable) ↔ Ungrouped/manual
  (notepad order, items drag-reorderable).
- **Quick-add** — a top add-row and a bottom inline add-row (optimistic insert → background tidy → animate
  into section; dedupe pill). Plus a **"Talk to the Chef" sheet** (brain icon → pills + textarea + working
  shimmer) for natural-language add/query — the secondary path.
- **Staples** — "QUICK ADD · YOUR STAPLES" horizontal chip row, tap-to-add.
- **Check-off** — checking removes the item from its section into a single collapsible bottom **"GOT IT"**
  zone; "List complete" banner when all checked.

## Decisions baked in (were the OPEN questions; now RESOLVED)
- **Merge-review: inline + under-merge** — uncertain merges shown inline, no required action; the aggregator
  under-merges (genuinely-different items stay separate), so the amber dot only means "verify the count."
- **Manual add: free-form + AI tidy** (resolves open-questions #1) — no structured catalog picker.
- **Quick-add is inline top/bottom, NOT a docked bottom bar** → no design-rule carve-out needed.
- **Check-off = one GOT IT zone** (not strike-in-place, not per-section sinking).
- **Grouped ↔ manual toggle with section + item reorder** ships.
- **Talk-to-the-Chef grocery sheet** ships as the secondary NL add path.
- **Staples = tap-to-add chip row** (offer, not auto-add — no pantry in V1).

## Not designed here — build in our vocabulary (deferred bespoke design)
- **Empty / no-plan:** just the normal list with zero items + the add row (no distinct screen).
- **Error / retry:** minimal, reuse Plan's stream-error card (a bespoke Groceries error is a later pass).
- **Mid-week resync ack pill:** the resync feature itself is deferred out of 1D.
- **Meal-sheet recipe upgrade** (the wife's during-review read): a Plan-tab surface (Slice A), not the
  Groceries tab — not in this design file.

## Build notes
- Build order: backend (hydration spine, list generation) has no dependency on this design; this design
  drives the list UI + interactions (Slices C/D). See `docs/scope-1D.md` + `~/.claude/plans/rippling-herding-glacier.md`.
- Verify at wrap: `/visual-qa` comparing the built screens against `imported.dc.html`; ux-design-critic taste
  pass; then Griffin's taste review.
