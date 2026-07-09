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

## Not yet cataloged (future)
- Recipes tab (Phase 1B) flows — capture/import/generate/modify/versioning.
- Groceries tab (Phase 1D) — once built.
- Auth: login loop / chunked-cookie regression (see whats-next).
