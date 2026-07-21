# Plan Tab — Test-Case Catalog

The canonical set of Plan-tab test cases. Runnable by hand now; the 1:1 spec the
E2E harness will automate (see `docs/plans/spike-e2e-testing-harness.md`).

Status legend: ✅ built & expected to pass · ⚠️ built but NOT click-verified (as
of Session 16) · 🟢 E2E-automated & passing (Session 17) · 🔴 E2E finding · ⛔ blocked.

**Session 17:** D1-D7 / RG1-RG5 / M1-M7 automated. **Session 17 (cont.):** E1-E4
(elapsed) + X1-X2 (error/retry) automated too, and D7 resolved (Griffin accepted
background scroll). Full suite: **30 passing, 0 findings** (`npm run test:e2e`).
Plan-tab mechanics are now machine-covered end to end except the low-risk G/R/W
generate/review rows. D3 — the pointer-lockup regression — is verified sound.

## Setup / preconditions
- Dev server: `PORT=3001 npm run dev` (FFOS owns 3000). Sign in via the DevTools
  console snippet.
- **Seed states** (the harness will script these; today they're set by hand /
  date-shift UPDATEs): `EMPTY` (no plan), `DRAFT` (unconfirmed, starts today),
  `MIDWEEK` (confirmed: some past + tonight + upcoming), `ELAPSED_CONFIRMED`
  (confirmed, all days past), `ELAPSED_DRAFT` (unconfirmed, all days past).
- **AI note (for automation):** generate (`/api/plan/stream`) and modify
  (`plan.modify`) hit a real LLM — slow, costs tokens, nondeterministic. E2E
  must intercept both and return fixtures. Manual runs use the real chef.

---

## G — Generation

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| G1 | EMPTY | Tap a suggestion pill | Streams skeleton→filled meal cards, lands on Review with a chef summary | ✅ (Test 1) |
| G2 | EMPTY | Type intent in the textarea, send | Same as G1, plan reflects the typed intent | ✅ |
| G3 | EMPTY | Tap "let your chef figure it out →" (no request) | Generates a plan with no user constraint | ✅ |
| G4 | EMPTY, force stream error | Trigger generation | "The chef got stuck…" card + working "Try again" button | ✅ |

## R — Review → Confirm

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| R1 | DRAFT | Read hero (chef summary, "N dinners · ~M ingredients"), tap "Looks good →" | Status → confirmed; hero shows "Plan confirmed ✓" | ✅ (Test 6) |
| R2 | DRAFT | Scroll until the hero leaves the viewport | Sticky confirm bar appears at the bottom anchor (above tab bar); disappears when hero returns | ✅ |
| R3 | DRAFT | Tap a meal card (anywhere on it) | Expanded sheet opens for that meal | ✅ (Test 3/3R) |

## M — Modify affordance (Session 16 — the app-wide pattern)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| M1 | DRAFT | Tap an inline card chip | Instant tap-depress; card dims + chip row → "Reworking {day}'s dinner…" + shimmer; ~2-5s later new content lands with a highlight ring that fades. No sheet opened. | 🟢 |
| M2 | DRAFT | Open a card → tap an action row in the sheet | Sheet STAYS OPEN showing pending ("Reworking {day}'s dinner…" + shimmer), actions disabled → on success sheet closes onto the changed card (highlight ring) | 🟢 |
| M3 | DRAFT | Open a card → "Something else? Tell your chef" → type a change, send | Only that meal's day changes (scope anchor works — Session 15 regression) + affordance as M2 | 🟢 (Test 5) |
| M4 | DRAFT | Hero "Talk to the Chef" → "make this week lighter", send | Sheet pending → closes → bottom ack pill with the chef's sentence; tap it scrolls to the first changed card (which is highlighted) | 🟢 (Test 4) |
| M5 | DRAFT | Any modify from any path | NO top-of-page toast anywhere; change is never silent (regression guard for the pre-Session-16 behavior) | 🟢 (asserts bottom-anchored feedback) |
| M6 | DRAFT, a modify in-flight | Tap another chip / submit another modify | Second modify is blocked (single active plan → single active modify) | 🟢 |
| M7 | DRAFT | Whole-week or scoped "we're eating out Wednesday" | Wednesday becomes the de-emphasized "Eating out" card AND is highlighted + scroll-to works (removed-day bug fixed S16) | 🟢 |

## RG — Regenerate / new plan (Session 16 — V1 blocker, was Test 8)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| RG1 | DRAFT | Scroll to end → "Not feeling this week? Start over →" | Lands on the intent screen (pills + textarea), NO replace-warning line, "← Keep current plan" present | 🟢 (Test 8) |
| RG2 | MIDWEEK/confirmed | "Starting fresh? Plan a new week →" | Intent screen WITH the muted "Generating a new plan will replace this week's meals." line | 🟢 (Test 8) |
| RG3 | from RG1/RG2 | Tap "← Keep current plan" | Returns to the existing plan, unchanged | 🟢 |
| RG4 | from RG1/RG2 | Tap a pill / send | Streams a NEW plan; the old plan is fully replaced (one-active-plan) | 🟢 (Test 8) |
| RG5 | DRAFT, a modify in-flight | Start over → generate before the modify resolves | The stale modify does NOT overwrite the newly generated plan (token guard, S16 bug fix) | 🟢 |

## E — Elapsed plan / week wrapped (Session 16)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| E1 | ELAPSED_CONFIRMED | Open Plan tab | "That's a wrap on this week. You cooked N dinners. How'd they land?" + "HOW'D IT GO" thumbs recap + "Plan next week →". NOT the old mid-week view. | 🟢 |
| E2 | ELAPSED_CONFIRMED | Tap a thumb in the recap | Toggles + persists; writes to chef memory | 🟢 (toggle+persist; memory write not asserted) |
| E3 | ELAPSED_DRAFT | Open Plan tab | "This plan's gone stale." variant; no thumbs section | 🟢 |
| E4 | ELAPSED_* | "Plan next week →" | Intent screen → generate replaces the elapsed plan | 🟢 |

## W — Mid-week (existing)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| W1 | MIDWEEK | Open Plan tab | Highlighted "tonight" card; "EARLIER THIS WEEK" (past + thumbs); "COMING UP"; Talk-to-Chef link + "Plan a new week →" | ✅ (Test 7) |

## D — Drawer dismissal (Session 16 — HIGHEST RISK, un-click-verified)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| D1 | any sheet open | Tap the X (top-right) | Sheet closes | 🟢 |
| D2 | any sheet open | Tap the dimmed area outside the sheet | Sheet closes | 🟢 |
| D3 | — | Open a sheet → close via outside-tap → tap a meal card | Card OPENS (page not pointer-events-locked — the two-drawer lockup did NOT return) | 🟢 **verified — lockup did NOT return** |
| D4 | any sheet open | Drag the sheet down by the handle | Sheet dismisses | 🟢 |
| D5 | any sheet open | Press Escape | Sheet closes | 🟢 |
| D6 | any sheet open | Tab / screen-reader from the top | Reaches the sheet heading before the "Close" control | 🟢 |
| D7 | any sheet open | Scroll the background behind the sheet | Background SCROLLS freely (Griffin accepted: he wants both a scrollable background AND click-outside). Spec guards against a future accidental scroll-lock. | 🟢 (resolved — accepted behavior) |

## X — Error / retry (Session 16)

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| X1 | DRAFT, force modify failure | Tap an inline chip that fails | Bottom "That didn't take — try again?" pill with a Retry button; Retry re-fires the same request | 🟢 (via [E2E:FAIL] token) |
| X2 | DRAFT, force modify failure | Fail a modify launched from a sheet | Sheet stays open with the retry line; send/actions re-enabled | 🟢 (via [E2E:FAIL] token) |

---

## GR — Groceries tab (Phase 1D Slice C, Session 25; GR8–GR11 Slice D, Session 26)

The shoppable list. Grocery items + staples are seeded directly to named states
(`GROCERY_READY` / `GROCERY_GENERATING` / `GROCERY_ERROR` / `GROCERY_PENDING`) so the
mechanics are deterministic; quick-add's tidy and the Talk-to-Chef NL→ops task run
through the real AI mock (deterministic `grocery-talk` fixture). Spec:
`tests/e2e/specs/groceries.spec.ts`.

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| GR1 | GROCERY_GENERATING | Open Groceries | Phase-named generating copy ("Sorting your ingredients…"); the list is hidden | 🟢 |
| GR2 | GROCERY_ERROR | Open Groceries | Error card ("The chef got stuck…") + "Try again" (reuses Plan's stream-error card) | 🟢 |
| GR3 | GROCERY_PENDING | Open Groceries | Fires generate once, polls, resolves to the ready list + add row | 🟢 |
| GR4 | GROCERY_READY | Check an item's checkbox | Item leaves its section → the single bottom GOT IT zone; progress advances; persists across reload | 🟢 |
| GR5 | GROCERY_READY | Quick-add "Tomatoes"; then quick-add an existing item | New row inserts (optimistic + AI tidy); a duplicate shows the dedupe pill, no second row | 🟢 |
| GR6 | GROCERY_READY | Toggle Grouped → Ungrouped, reload | Sections collapse to a flat list; the mode persists across reload | 🟢 |
| GR7 | GROCERY_READY | Drag a section by its grip, reload | Aisle order changes and persists (`aisleOrder`) across reload | 🟢 |
| GR8 | GROCERY_READY (3 active staples, 1 already on list) | Tap the "Olive oil" staple chip | Off-list staples show as chips (on-list garlic hidden); tap adds the item and the chip drops out of the row | 🟢 |
| GR9 | GROCERY_READY | Open the chef (brain), pick "Add stuff for taco night", send | NL→ops adds the meal's items; the chef's reply shows; items land on the list | 🟢 |
| GR10 | GROCERY_READY | Open the chef, pick "What am I out of?", send | Query-only: the reply shows, the list is unchanged (no ops applied) | 🟢 |
| GR11 | GROCERY_READY | Open the chef, type "remove the garlic", send | The item's `[N]` ref resolves to the real row and it's removed (the ID-safety path) | 🟢 |

**Groceries: 11 passing**, 0 findings. Merge quality (canonical sums, under-merge
correctness) and NL→ops quality are wrap-time real-model checks + Griffin's taste pass
— the harness mocks the model.

---

## RC — Recipes tab (Phase 1D Slice D, Session 27)

The reorg. Recipes (+ an optional plan and past confirmed slots) are seeded directly to
named states (`RECIPES_LIBRARY` / `RECIPES_COOKED_HARVEST` / `RECIPES_EMPTY`) so the tier
mechanics are deterministic; the cooked harvest runs server-side on list load. Spec:
`tests/e2e/specs/recipes.spec.ts`.

| ID | Pre | Steps | Expected | Status |
|----|-----|-------|----------|--------|
| RC1 | RECIPES_LIBRARY | Open Recipes | Cooked strip (most-recent first) + segmented `All 7 / Favorites 2 / Cooked 2` + `FROM YOUR PLANS` folded ("3 tucked away") | 🟢 |
| RC2 | RECIPES_LIBRARY | Tap "Favorites" | Only favorited library recipes show | 🟢 |
| RC3 | RECIPES_LIBRARY | Tap "Cooked" | Cooked recipes show, each with a "Cooked …" badge | 🟢 |
| RC4 | RECIPES_LIBRARY | (7 library recipes) | 5 shown + "Show 2 more"; tapping reveals all 7 | 🟢 |
| RC5 | RECIPES_LIBRARY | Unfold `FROM YOUR PLANS` | Draft cards appear with a "Plan draft" badge | 🟢 |
| RC6 | RECIPES_LIBRARY | Favorite a plan draft | Toast "Moved to Your recipes"; leaves drafts; after reload it's a favorited library recipe, not a draft (detach persisted) | 🟢 |
| RC7 | RECIPES_LIBRARY | Search a draft's name, then a cooked recipe, then clear | Search reaches every tier (incl. folded drafts); clearing restores the tiered view | 🟢 |
| RC8 | RECIPES_LIBRARY | Tap ＋ → Generate | The create menu opens; Generate opens the "Ask your chef" dialog | 🟢 |
| RC9 | RECIPES_COOKED_HARVEST | Open Recipes | A recipe with a past confirmed slot (no seeded `lastCookedAt`) is harvested into the cooked strip + out of drafts; an unrelated recipe stays out | 🟢 |
| RC10 | RECIPES_EMPTY | Open Recipes | First-run empty state ("Your recipe library is empty") | 🟢 |

**Recipes: 10 passing**, 0 findings. **Full suite: 51 passing** (30 Plan + 11 Groceries
+ 10 Recipes). Taste (does the tier split read calm, the double bottom-bar) → Griffin.

---

## Visual-QA capture coverage (Layer A — `playwright.capture.config.ts`)
The capture harness (Claude reads the PNGs, critiques vs `docs/design/visual-qa-rubric.md`) now covers three tabs:
- **Plan** — `plan.capture.ts` (5 states; HUD-verified).
- **Groceries** — `groceries.capture.ts` (S28): ready-grouped, generating, error, manual-mode, checked-GOT-IT, chef-sheet. No HUD section → `useHud:false`, gated on readyText + facts.
- **Recipes** — `recipes.capture.ts` (S28): library, cooked-filter, drafts-expanded, create-menu, empty.
S28 gate: 0 blockers, 0 high across all 11 Groceries+Recipes states.

## Not yet cataloged (future)
- 1B recipe flows — capture / import / generate / modify (the AI-calling recipe mutations).
- Groceries — item drag-reorder (manual mode) + merge-review split interactions (unit-covered; add E2E if they regress).
- Auth: login loop / chunked-cookie regression (see whats-next).
