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
| BUG-007 | 🔴 | **Supabase rejects the `service_role` key → the whole E2E harness can't authenticate.** GoTrue returns `403 bad_jwt: unrecognized JWT kid <nil> for algorithm ES256` for every admin call, so `auth.setup.ts` can't mint the test session and **all 70 E2E specs fail to run**. The project's JWT signing keys have been migrated to asymmetric (ES256), which revokes the legacy JWT-format `service_role` key in `.env.local`. **Not a code defect** — the same key worked earlier in S36; the REST endpoint and the anon key still respond 200, only the auth-admin API rejects it. Blocks `/visual-qa` too (same storageState). | `set -a; . ./.env.local; set +a; curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users?page=1&per_page=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"` → 403 `bad_jwt`. Or run `npm run test:e2e` → setup fails, 69 did not run. | S36 (2026-07-24), 1E #4 E2E run | **Griffin action, next session:** copy the current secret/service key from the Supabase dashboard (Settings → API; with asymmetric JWTs this is the new `sb_secret_…` format) into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`, then re-run `npm run test:e2e`. If the harness needs the new key format, `tests/e2e/harness/supabase-session.ts` is the only consumer. | `open` |
| BUG-006 | 🟡 | **Plan-tab expanded sheet shows the FULL recipe, not a summary.** Tapping a meal card on Plan opens `ExpandedMealSheet`, which renders the full `RecipeView` (ingredients + steps) inline (`src/components/plan/expanded-meal-sheet.tsx:220`). Griffin wants a **summary card** — key info + the AI action chips — with a **"View full recipe →" link out**, not the whole recipe embedded in the sheet. **Not a routing bug** (verified: card tap opens the sheet, exactly as the S8 "Card Tap Interaction Model" intends); the deviation is the sheet's *content density* — it embeds `RecipeView` where a preview + link belongs. | On Plan, tap any confirmed meal card → the bottom sheet shows full ingredients + steps rather than a summary + link. | S35 (2026-07-24), Griffin testing | **Fold into Phase 1E.5** — the expanded meal sheet is one of the enumerated all-states Plan surfaces being rebuilt; the summary-vs-full split is a design call for that buildout, not a one-off patch. Design input, not a blind fix. | `open` |
| BUG-005 | 🟠 | **App-wide: `font-sans` may not resolve to Geist → serif fallback.** `layout.tsx` loads `Geist` as `--font-geist-sans`, but `globals.css` maps `--font-sans: var(--font-sans)` (self-reference, no bridge to `--font-geist-sans`). In the headless Layer-A capture, all headings/prose render in a serif fallback (every tab, not just You). May render the system sans on-device (`system-ui` in the default stack), so it could be capture-only — **needs an on-device check.** | Open any tab in the Layer-A capture (`playwright.capture.config.ts`) → headings/body are serif. On-device: unverified. | S33 (2026-07-22), You visual-QA | **Confirm on-device first.** If serif on device: one-line fix — point `--font-sans` at `var(--font-geist-sans)` in `globals.css`. Cross-cutting (all tabs) → fold into the **1F design-system pass**, not a 1E change. | `open` |
| BUG-003 | 🟡 | **Cooked-harvest writes inside a `recipe.list` query.** `recipe.list` (a tRPC query / GET-shaped) runs `harvestCookedRecipes` — a grouped select + per-recipe UPDATEs — on every load and every favorite invalidation. Idempotent & documented, but write-work on a read path that React Query may refetch/retry. | N/A (design smell, not a user-visible fault today). | S28 (2026-07-21), Slice C/D code review (finding #5) | Revisit if/when a scheduler exists (move the harvest to a cron/confirm-time job) or if `recipe.list` perf degrades. Accepted for V1. | `open` |

---

## Resolved

| ID | Sev | Summary | Found | Resolved | How |
|----|-----|---------|-------|----------|-----|
| BUG-002 | 🟠 | **Merge produced duplicate name-lines** — the same canonical item on two rows: `Salt 3.25 tsp` + `Salt (to taste)`, `Black pepper 2.25 tsp` + `Black pepper`, `Carrot 1.5 lb` + `Carrot 0.5 cup`. Safe under-merge, but untidy to a shopper. | S28 (2026-07-21), real-model merge eval | **S31 (2026-07-22)** | Added a **buy-unit table** to the aggregator (`src/server/grocery/buy-units.ts`). Items a shopper buys as ONE thing consolidate to a single row: **staples** (salt, pepper, oils, dried spices, vinegars) collapse to one **unquantified** row — the measured tsp is shopping noise (Griffin's call: drop the number, the per-meal amounts survive in the amber-dot breakdown); **concrete buy-unit** produce (carrot→lb, onion→count, …) collapses to one row that sums the buy-unit and **absorbs off-unit amounts without converting** (no fake lb↔cup math), tiebreaking to a plain count so "2 carrots + 0.5 cup" shows "2", not "0.5 cup". Keyed on the AI's canonicalName, so it only ever *increases* merging for the named set and can **never** merge two different items (a table miss = status quo). +16 aggregate/buy-unit tests. |
| BUG-001 | 🟡 | **Quick-add optimistic category misfired on compound words** — `guessCategory`'s substring `includes` sent "watermelon"→beverages (via "water"), "butternut"→dairy (via "butter"), "eggplant"→dairy (via "egg") for ~1s until the async `tidyItem` re-homed the row. | S28 (2026-07-21), Slice C/D code review (#4) | **S31 (2026-07-22)** | `guessCategory` now matches **whole words** (+ simple -s/-es plural), with an allowlist for intentional stems (`berr` → blueberry/berries) and multiword phrases, plus added produce terms (watermelon/melon/squash/eggplant). "water"↛"watermelon", "butter"↛"butternut", "egg"↛"eggplant"; "blueberries"/"ground beef" still classify right. New `grocery-categories.test.ts`. Note: a pre-existing keyword-ordering quirk (`ice cream`→dairy via "cream", `baking soda`→beverages) is unchanged and self-corrects via the AI tidy. |
| BUG-004 | 🔴 | **Full-week grocery generation is slow / can time out.** A single batched `ingredient-normalize` over a 7-dinner week (~70 lines) took **37.7s** (S28) on the confirm critical path — over the old 30s AI timeout — so a real week's list could fail normalize, and perceived latency was far past Griffin's "even 15s is too long" bar. | S28 (2026-07-21), real-model merge eval | **S30 (2026-07-21)** | Generation-architecture rethink (plan `~/.claude/plans/resume-meal-app-peppy-simon.md`). Normalize moved OFF confirm: each recipe normalizes during plan review (a decoupled best-effort `plan.normalizeSlot` the walker fires after hydrate) and caches on the recipe row (`normalized_ingredients`, migration `0005`); confirm reads the cache and AI-normalizes only cache-misses (zero AI calls on a fully-reviewed week → instant aggregate). Phase D added the honest "Finishing N recipes…" straggler hint + early-confirm instrumentation. **Real-model eval PASSED:** per-recipe normalization == the old batch's merge quality (garlic ×6, salt ×4, olive-oil ×4 identical; scallion↔green-onion synonym canonicalized identically with no co-occurrence advantage), and the ~27–37s batch is entirely off confirm (confirm→ready ≈ aggregate-only, ~0ms). Code review found + FIXED a rate-limit fan-out regression (`bgAiProcedure` — the background normalize gets its own bucket so it can't 429 a user-visible hydrate). 306 unit + 53 E2E green. The S28 60s stopgap timeout stays as a belt-and-braces for the rare residual batch. |
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
