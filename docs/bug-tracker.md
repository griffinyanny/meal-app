# Bug Tracker — parked defects & risks

> **What this is.** The single home for every **known defect or risk we've chosen to park**
> rather than fix on the spot. A bug does not get "deferred to the backlog" — it gets an entry
> here, with a **repro**, a **severity**, a **when-to-address target**, and a **status we close out**.
> Nothing rots: every session end reviews the Open table, and closing an item moves it to the
> Resolved log with the date + how.
>
> **Distinct from the other docs:** `idea-backlog.md` = features/ideas; `open-questions.md` =
> unresolved *decisions*; **this file = reproducible things that are wrong or risky.** If you can
> write a repro for it, it belongs here.

**Severity:** 🔴 high (breaks a core flow / data / trust) · 🟠 med (degrades UX, has a workaround) ·
🟡 low (cosmetic / self-correcting).
**Status:** `open` · `in-progress` · `resolved` (→ moved to the Resolved log).

---

## Open

| ID | Sev | Summary | Repro | Found | Address by | Status |
|----|-----|---------|-------|-------|-----------|--------|
| BUG-004 | 🔴 | **Full-week grocery generation is slow / can time out.** The single batched `ingredient-normalize` call for a 7-dinner week (~70 lines) took **37.7s** on gpt-4.1-mini — over the 30s one-shot AI timeout — so a real week's list could fail normalize and land in the error state. Perceived latency is also too high even when it succeeds. | Confirm a 7-dinner plan → open Groceries → time the "Merging your grocery list…" phase. Real model only (harness mocks the AI). | S28 (2026-07-21), real-model merge eval | **Next** — dedicated generation-architecture design pass (see the S28 discussion: incremental normalize during review, recipe caching, loading-treatment). Stopgap (60s timeout) already applied S28 so it no longer *errors*. | `in-progress` |
| BUG-002 | 🟠 | **Merge produces duplicate name-lines.** The aggregator (correctly) won't combine a quantified line with an unquantified one, or across different units — so the same canonical item can appear on two rows: `Salt 3.25 tsp` + `Salt (to taste)`, `Black pepper 2.25 tsp` + `Black pepper`, `Carrot 1.5 lb` + `Carrot 0.5 cup`. Safe under-merge, but looks untidy to a shopper. | Confirm a week where an item appears both measured and "to taste", or the same item in two units. | S28 (2026-07-21), real-model merge eval | The **buy-unit / consolidation fast-follow** (was gated on the merge eval — now unblocked). V1.5-ish. | `open` |
| BUG-001 | 🟡 | **Quick-add optimistic category misfires on compound words.** `guessCategory` uses substring `includes`, so "watermelon"→beverages (via "water"), "butternut"→dairy (via "butter"), for ~1s until the async `tidyItem` AI call re-homes the row. | Quick-add "watermelon" on Groceries → it drops under Beverages, then hops to Produce a beat later. | S28 (2026-07-21), Slice C/D code review (finding #4) | Opportunistic — fold into the quick-add polish or the buy-unit fast-follow. | `open` |
| BUG-003 | 🟡 | **Cooked-harvest writes inside a `recipe.list` query.** `recipe.list` (a tRPC query / GET-shaped) runs `harvestCookedRecipes` — a grouped select + per-recipe UPDATEs — on every load and every favorite invalidation. Idempotent & documented, but write-work on a read path that React Query may refetch/retry. | N/A (design smell, not a user-visible fault today). | S28 (2026-07-21), Slice C/D code review (finding #5) | Revisit if/when a scheduler exists (move the harvest to a cron/confirm-time job) or if `recipe.list` perf degrades. Accepted for V1. | `open` |

---

## Resolved

| ID | Sev | Summary | Found | Resolved | How |
|----|-----|---------|-------|----------|-----|
| BUG-R03 | 🟠 | Grocery item **name** was edited via a bare `<p onClick>` — not keyboard/screen-reader reachable (a11y). | S28, code review #1 | S28 (2026-07-21) | Converted to a keyboard-accessible `<button>` with `aria-label`; merge dot marked `aria-hidden`. |
| BUG-R02 | 🟠 | Manual-mode reorder renumbered only **unchecked** items → checked items reappeared out of order once unchecked. | S28, code review #2 | S28 (2026-07-21) | `onItemDragEnd` now renumbers the whole list (reordered visible items + checked items, contiguous 0..N-1). |
| BUG-R01 | 🟡 | `commitEdit` double-fired on Enter (keydown + unmount blur) → a redundant duplicate `editItem` write. | S28, code review #3 | S28 (2026-07-21) | Added a `handledRef` guard; Escape also marks handled so the blur can't commit discarded text. |

---

## How to use this (protocol)

1. **Parking a bug = an Open row here.** Assign the next `BUG-00N`, a severity, a concrete repro, the
   session found, and an honest "address by" target (a phase, a fast-follow, or "next"). Never park a
   defect with only a mention in changelog/backlog.
2. **Every session end:** skim Open. Anything addressed moves to Resolved (keep its ID, add the date +
   how). Anything whose target has arrived gets pulled into that session's plan.
3. **Cross-link:** reference the `BUG-00N` id in code comments where a stopgap or known-issue lives, and
   in the changelog entry for the session that finds or closes it.
