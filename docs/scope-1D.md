# Phase 1D Scope — Groceries

> **What this document is.** The phase-level scope contract: the settled architecture, in-scope
> features with acceptance criteria, explicit deferrals, and a change log. The release-level view
> lives in [scope-v1.md](scope-v1.md) (the hub — start there); this is its 1D spoke. Griffin owns
> scope; Claude builds against it — nothing gets built that isn't here, and scope changes land as
> change-log lines, not drift.
>
> **Execution plan (authoritative, deeper than this doc):** `~/.claude/plans/rippling-herding-glacier.md`
> (reconciled 2026-07-20) + the architecture memo `~/.claude/plans/resume-meal-app-sorted-reddy-agent-ab9e5e211025b4d32.md`.

**Created:** 2026-07-19 (S21) · **Reconciled:** 2026-07-20 (S22) · **Milestone:** Phase 1D, M4, part of V1 "The 10-Minute Weekly Ritual"
**Phase status:** 🔨 Slice 0 ✅ + A ✅ + B ✅ + C ✅ + **Slice D ✅ (S26 staples #12 + Talk-to-Chef #11; S27 Recipes reorg #14 + cooked harvest)** → **Slice 5 wrap** remains (real-model merge-quality eval + `/code-review` + `/visual-qa` + deploy)

---

## Milestone goal

**M4: a confirmed plan produces a usable grocery list.** Closes the north-star loop — "I have no idea
what to cook" → "my grocery list is ready" — end to end for the first time. Confirm a week on Plan and a
**merged, categorized, quantity-summed, shoppable list** falls out with no manual sync step. Ingredient
merging ("2 cups + 1 cup broth = 3 cups"; "scallions" = "green onions") is the hard V1 problem 1D solves.

**Definition of done for 1D:**
1. Every in-scope feature below meets its acceptance criteria (machine-verified where mechanical).
2. **Merge quality holds on a real week/model** — canonical quantity sums + semantic canonicalization come
   out correct, with the aggregator **under-merging** genuinely-different items rather than mis-merging.
   Griffin judges (the soft criterion, like 1C's chip/variety gate).
3. The full loop runs under 10 minutes on a real week (idea → plan → hydrate-in-review → confirm → list).
4. Groceries has E2E coverage (harness extended); gauntlet + build green.

---

## Architecture (settled — the reason for the planning pass)

**The list is a deterministic projection:** `list = aggregate(recipes of the confirmed plan) + manual
items + active staples`. It runs at **confirm** (re-runs only on **retry** in 1D; mid-week resync deferred).

**Recipes hydrate at plan time, in the background during review** (client-orchestrated per-slot
`plan.hydrateSlot`, day-1-first, tap-to-prioritize, resumable, + a confirm-time server sweep). Reason: the
wife wants full recipe detail while evaluating the week, and it makes the list near-instant at confirm.
Hydrated recipes are real `recipes` rows (`sourceType:"plan_generated"` + `sourcePlanId`).

**Merge = hybrid**: one batched `ingredient-normalize` AI call (canonical name, category, numeric qty,
canonical unit + confidence) + a **pure, unit-tested deterministic aggregator** that does all the
arithmetic and **under-merges** (different type/form ⇒ separate lines). **No LLM arithmetic** (2026-05-26
rule). **Merge-review = inline**: uncertain merges carry an amber dot → tap to expand the per-meal
breakdown + split. No required user action. Full rationale + the 12 reconciliation decisions live in the
plan file and `decisions.md` (2026-07-20 entry).

---

## In scope — with acceptance criteria

Status: ✅ shipped & verified · 🔶 in progress · ⬜ not built

| # | Feature | Acceptance criteria | Status |
|---|---------|--------------------|--------|
| 1 | **Background hydration (plan-time)** | Plan review hydrates slots into full recipes via `plan.hydrateSlot` (reuses 1B `generate-recipe`), day-1-first, tap-to-prioritize; idempotent (skip `ready`, **CAS on the `recipeStatus` column** — not `updatedAt`, see decisions.md S23); resumable from `plan.current`; card shows shimmer→ready. Non-cookable + past slots skip. Failure is non-fatal (falls back to preview pills). | ✅ |
| 2 | **Modify-invalidation fix** | `plan.modify` nulls `recipeId` + sets `recipeStatus:"stale"` on every changed meal (fixes the latent `toSlotValues` bug); stale slots re-hydrate. Covered by the plan-modify regression tests. | ✅ |
| 3 | **Meal-sheet recipe upgrade** | Expanded meal sheet shows a hydration-aware recipe section (writing→full→failed) via an extracted presentational `RecipeView` (from `recipe-detail.tsx`), reused inline — the wife's during-review need. Sheet reads the live slot by id, so writing→full flips in place. | ✅ |
| 4 | **Confirm → list generation** | `plan.confirm` = fast status flip + creates `grocery_lists(pending)`. Idempotent `grocery.generate` runs sweep→normalize→aggregate→write (checkpointed `generationStatus`), producing `grocery_items` with quantity, unit, category, `sources` provenance. Tab polls; phase-named loading copy. | ✅ (S24; the shoppable UI is #7/Slice C — Slice B renders a plain grouped list) |
| 5 | **AI ingredient-normalize task** | New AI task (reserved config slot) → per-line `{canonicalName, category, numericQty, canonicalUnit, confidence}`. Zod strict-mode, prompt snapshot-tested, graceful fallback. Returns NO summed quantities. | ✅ (S24) |
| 6 | **Deterministic aggregator** | Pure function: parses qty strings (fractions, ranges, "pinch"→unquantified), sums by canonical group + unit, and **under-merges** (different type/form ⇒ separate). Heavily unit-tested; the correctness core. **No LLM arithmetic.** | ✅ (S24; 22 aggregator unit tests) |
| 7 | **The list UI (categorized) + organize toggle** | Built from the imported design: category-grouped glass rows; **Grouped ↔ Ungrouped/manual ("notepad") toggle**, with **section reorder + item drag** persisted (`organizeMode`, `aisleOrder`, item `position`). | ✅ (S25; `@dnd-kit`, touch-first long-press drag) |
| 8 | **Inline merge-review** | Uncertain merges show an amber dot; tap the row → per-meal breakdown + "Split into separate items" (split = direct `grocery_items` edit). No banner/strip/overlay, no forced action. | ✅ (S25; amber = `sources.length > 1`, split = `splitItem` per-source) |
| 9 | **Check-off (one zone)** | Checking removes the item from its section and drops it into a single collapsible bottom **"GOT IT"** zone. Progress bar + quiet "List complete" banner. Persists; survives refresh. | ✅ (S25; E2E GR4) |
| 10 | **Quick-add (free-form)** | Top add-row + bottom inline add-row: type anything (incl. `household`) → optimistic insert → background AI tidy (categorize) → animate into section; dedupe pill on duplicates; no autocomplete in 1D. Resolves open-question #1 toward free-form. | ✅ (S25; client category guess → `tidyItem` AI refine; client dedupe pill; E2E GR5) |
| 11 | **Talk-to-the-Chef sheet (secondary)** | Grocery NL add/query sheet ("add stuff for tacos", "what am I out of") backed by a new NL→list-ops AI task (Zod-validated ops, never trust AI item IDs). Secondary to the text quick-add. | ✅ (S26; `grocery-talk` task + snapshot prompt + `grocery.talk` router; ops reference items by a numbered `[N]` ref the server resolves to a real id + bounds-checks — the model never sees/emits a db id; brain-icon sheet reuses the shared `TalkToChefSheet`; GR9–GR11 E2E) |
| 12 | **Staples chip row** | "YOUR STAPLES" horizontal chip row, tap-to-add; `staple_items` CRUD (schema exists, no router yet) + active/inactive. | ✅ (S26; `staples` router (list/add/setActive/remove, dedupe-by-name), `StaplesRow` hides staples already on the list, tap adds with the staple's curated category + `sourceType:"staple"`; GR8 E2E) |
| 13 | **Clipboard export** | Plain-text export of the current list (grouped, with quantities). The V1 "get it out of the app" fallback (no retailer integration). | ✅ (S25; "Copy" in the header) |
| 14 | **Recipes-tab organization** | Cooked / deliberate-library / plan-drafts tiers derived from `isFavorite` + `lastCookedAt` + slot dates (no explicit "I cooked it"); search reaches everything; favoriting = promote; drafts clean up with their plan. Tight-budget fallback: fold cooked to top of "Your recipes" with a badge. | ✅ (S27; built direction "d" from Claude Design — cooked STRIP + segmented `All/Favorites/Cooked` library + folded `FROM YOUR PLANS` shelf + floating search/＋ toolbar. Cooked harvest = lazy-on-read in `recipe.list` (idempotent, non-fatal); cook + favorite both detach `sourcePlanId` (durable graduation). Draft signal = `sourcePlanId != null`. RC1–RC10 E2E, first Recipes coverage.) |
| 15 | **Schema + provenance** | Migrations for all deltas (below) + RLS CI assertions on new tables/columns. `sources` jsonb authoritative; `sourceRecipeId` kept for back-compat. | ✅ (migration 0004, S22) |
| 16 | **E2E: extend harness to Groceries** | New specs: generation states, one-zone check-off, quick-add + dedupe, reorder persistence. Seed states + deterministic mock fixtures for the two new AI tasks. A feature isn't done until its mechanics are covered. | ✅ (S25; GR1–GR7, grocery seed states, `wipe()` extended; 37 E2E total) |
| 17 | **Carry-in: recipe.get consistency** | Align `recipe.get` null-vs-NOT_FOUND (open-question #3). **Resolved by rule** (S23): point-read queries return `null`, mutations throw `NOT_FOUND`; codified in a comment. | ✅ |

**Schema deltas:** `meal_plan_slots.recipeStatus`; `recipes.sourceType += "plan_generated"` + `sourcePlanId`
(reuse existing `lastCookedAt` for the cooked-harvest stamp); `grocery_lists.generationStatus` +
`generationError` + `organizeMode` + `aisleOrder`; `grocery_items.sources` jsonb + `packageLabel` (dormant).

**Quality note (like 1C 12–13):** merge quality (5, 6, 8) verifies on *real* generations + Griffin's eye,
not E2E — the harness mocks the model. E2E covers mechanics.

---

## Build sequence (slices — each ends green: lint + typecheck + unit; E2E where covered)

- **Slice 0 — Reconcile docs + save the imported design** *(✅ S22).*
- **Slice A — Hydration spine** (#1–3, #15 schema, #17 recipe.get) *(✅ S23 — `plan.hydrateSlot` + walker + `RecipeView` + meal-sheet upgrade + `recipe-generate` fixture; 185 unit + 30 E2E green).*
- **Slice B — List generation + the merge** (#4–6) *(✅ S24 — the pure `aggregate.ts` under-merge core, the
  `ingredient-normalize` task + snapshot-tested prompt + E2E fixture, `grocery.generate` orchestration
  (idempotent CAS + checkpointed phases + transactional replace), `plan.confirm`→pending list, Groceries tab
  generating/ready/error states + polling; 224 unit green).*
- **Slice C — The shoppable list** (#7–10, #13, #16) *(✅ S25 — the imported design built: grouped↔manual
  organize toggle + `@dnd-kit` touch-first drag-reorder (sections + items, persisted), inline merge-review
  (amber dot + breakdown + `splitItem`), one-zone GOT IT check-off + progress + banner, quick-add
  (optimistic + `tidyItem` AI categorize + client dedupe), clipboard export; 7 new grocery mutations +
  optimistic hook; GR1–GR7 E2E. 248 unit + 37 E2E green).*
- **Slice D — Staples + Talk-to-Chef + Recipes tab** (#11, #12, #14) *(🔶 S26: #11 + #12 shipped; #14 Recipes reorg awaits its design pass — the two shipped pieces are Groceries-tab and were already in the imported design; the reorg is a new surface, so it gets a design pass first).*
- **Slice 5 — Wrap** (#16, merge-quality eval on the real model, `/code-review` + `/visual-qa`, doc pass, deploy).

Backend (A/B) has no design dependency; the imported design drives C/D.

---

## Explicitly OUT of 1D scope

| Item | Where it lives | Why deferred |
|------|---------------|--------------|
| **Mid-week resync** (list update on a mid-week plan modify) + ack pill + already-bought + `mergeOverrides` | Later (design + build) | Griffin's call — keep the MVP tight; `grocery.generate` stays idempotent for retry regardless |
| **Bespoke empty + error states** | Later design pass | Empty = zero-item list + add row; error = minimal reuse of Plan's stream-error card |
| Buy-unit / package layer ("1 carton (32 oz) — you need 3 cups") | Fast-follow, gated on the merge-quality eval | A plain number is never wrong; a wrong pack size breaks trust |
| Catalog + brand memory ("Bounty") + autocomplete | V1.5+/Instacart era | 1D builds only the canonical `name` vs `rawName` seam |
| Retailer cart / checkout / aisle-map / barcode | V2 | Needs partnerships/APIs; V1 exports plain text |
| Light pantry ("what I have" / auto-subtract) | V1.5 | Staples ≠ pantry |
| Shopping mode · passive staple detection · multi-select combine · recipe variant clustering | Backlog | Post-core-loop |
| Unit-conversion engine (cups↔grams) | Backlog | 1D sums same-unit; mixed units listed separately |
| Cost/price estimates · nutrition roll-up | V3 | No pricing/health layer yet |

---

## Open scope questions (carried / resolved)

1. ~~Free-form vs. structured list entry~~ **RESOLVED (S22)** → free-form + AI tidy (quick-add), per the IA
   decision and the as-built design. (Was open-questions #1.)
2. **Staples auto-include vs. offer** — offered via the chip row (tap-to-add), not auto-added (no pantry in
   V1). Confirmed by the design; auto-add-with-dismiss graduates to V1.5.
3. ~~**`recipe.get` null-vs-NOT_FOUND**~~ **RESOLVED (S23)** → by rule: point-read queries return `null`,
   mutations throw `NOT_FOUND`. Codified in a comment on `recipe.get`. (Was open-questions #3.)

---

## Scope change log

| Date | Change | Why |
|------|--------|-----|
| 2026-07-19 (S21) | Doc created at 1D kickoff (confirm-time expand + hybrid merge). | Planning pass; settle the hard V1 problem before building. |
| 2026-07-20 (S22) | **Reconciled** with the pre-existing locked plan (`resume-meal-app-sorted-reddy.md`, forgotten at S21) → **plan-time hydration** supersedes confirm-time; adopted the projection model, the imported Claude Design (inline merge-review + Grouped/manual reorder + Talk-to-Chef sheet + one-zone check-off); **trimmed** mid-week resync, bespoke empty/error, and `mergeOverrides` out of 1D. | Griffin surfaced the older, more-thorough plan (architect + design-critic consulted) + completed the design in Claude Design; the two plans were merged into `rippling-herding-glacier.md`. |
| 2026-07-20 (S23) | **Slice A complete** — features #1–3, #15, #17 ✅. CAS token corrected to the `recipeStatus` column (not `updatedAt`); `recipe.get` resolved by rule (queries null / mutations throw). No scope change — build progress. | Hydration spine built + verified (185 unit + 30 E2E green). |
| 2026-07-21 (S25) | **Slice C complete** — features #7–10, #13, #16 ✅. Build calls (no scope change): (a) **drag = `@dnd-kit`, touch-first** (long-press-to-lift) not the design's native HTML5 drag — Griffin's call to build toward the phone gesture the native app will use; the app's one drag solution going forward. (b) **quick-add tidy** = instant client keyword category guess → optimistic insert → background `tidyItem` (reuses `ingredient-normalize`) refines category/name, non-fatal; **dedupe = client-side exact-name check** + pill (canonical/AI dedupe deferred). (c) 7 new grocery mutations (`editItem`/`splitItem`/`clearChecked`/`tidyItem`/`setOrganizeMode`/`reorderSections`/`reorderItems`) split across `grocery-item-mutations.ts` + `grocery-organize.ts` (300-line rule); optimistic `use-grocery-mutations` hook modeled on Plan. **Talk-to-Chef (#11) + staples (#12) + Recipes-tab (#14) remain for Slice D.** | Shoppable list built against the imported design + machine-verified (248 unit + 37 E2E). |
| 2026-07-21 (S27) | **Slice D COMPLETE** — Recipes-tab reorg #14 ✅ + the cooked-signal harvest. Built direction "d" from Claude Design in real components (cooked strip + segmented library + folded drafts shelf + floating search/＋ toolbar). Build calls (no scope change): (a) **cooked harvest = lazy-on-read** in `recipe.list` (idempotent/guarded/non-fatal) — can't stamp at confirm (future dates), no scheduler; (b) **cook = graduation**: the harvest also nulls `sourcePlanId` so cooked history is durable (matches the schema contract); (c) **draft signal = `sourcePlanId != null`** not a source-flip (keeps provenance; fixes the `plan_generated`→"Manual" card bug); (d) **search = flat cross-tier** (resolves open question); (e) **"Add manually" dropped** from the ＋ menu (no flow, out of 1D → backlog). First Recipes E2E coverage (RC1–RC10). 294 unit + 51 E2E green. **Only Slice 5 wrap remains.** | Design landed; the reorg + harvest built + machine-verified. |
| 2026-07-21 (S26) | **Slice D partial** — Talk-to-Chef #11 + staples #12 ✅ (the two design-independent, already-designed Groceries pieces). Build calls (no scope change): (a) **NL→ops ID-safety** — the `grocery-talk` model references existing items only by a numbered `[N]` ref we assign; the `grocery.talk` router resolves it to a real id from the household's own list and bounds-checks it, so a hallucinated ref is ignored (never trusts an AI id). Ops are add/remove only; a hard 12-op cap. (b) **Cooked signal resolved** (Griffin): a recipe is cooked when it's the recipe of a confirmed plan slot whose date has passed — auto-stamp `lastCookedAt`; no "I cooked it" tap. Feeds #14; built with the reorg. (c) `TalkToChefSheet` relocated `plan/` → `components/shared/` (2nd consumer) + gained `placeholder`/`resultMessage` props; `addItem` gained a `sourceType` for staple provenance. **#14 Recipes reorg deferred to its design pass** (in flight) — new surface, so design-first. | Slice D's Groceries pieces built + machine-verified (287 unit + 41 E2E green); the Recipes reorg is design-gated. |
| 2026-07-20 (S24) | **Slice B complete** — features #4–6 ✅. Two build clarifications, no scope change: (a) resolved the `numericQty`/"no LLM arithmetic" overlap — the AI's normalize outputs are grouping keys only (a wrong key can only under-merge, never mis-merge); all arithmetic is pure code, `numericQty` is a solo-only fallback. (b) The amber merge-review dot is derived from `sources.length > 1` (no new column) — faithful to #6 and keeps migration 0004 unchanged. | Hybrid merge built + verified (224 unit green). |
