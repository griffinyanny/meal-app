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

> **✅ S44 — THE PLAN SPECS ARE MIGRATED (BUG-024 closed).** Phase 1E.5 rebuilt the Plan tab onto the
> day-container rail, which replaced the DOM the D / M / RG / E / X specs selected against — **21 of 78
> red**. All five causes are now handled and the suite is **90 green**: `reviewHero` → the
> `data-testid="plan-rail"` anchor; the AI chips moved into the meal sheet (`runMealAction` opens it
> first); the in-card `Reworking …` label became a gold ring on the row, asserted by **computed
> `box-shadow`** rather than a class name; the standalone `Talk to the Chef` button became the chef
> header's `Something's off`; and `Start over →` — which the rebuild had dropped outright — came back as
> the foot link under the rail (BUG-026). **Assertions were extended, never weakened**: M1 proves the
> ring is on the changed row and nowhere else, M5 measures the toast against the confirm bar's real
> bounding box, M6 proves every chef action goes inert rather than that one tap was silently dropped.
>
> New families: **`P` — the rail** (P1–P9) and **`C` — cost** (C1–C4). New seed states: `CONFIRMED`,
> `PROVISIONAL`, `CHOSEN_DAYS`, `DENSE`, `UNCOOKED_PAST`. **ADVERSARIAL is re-pointed, not preserved** —
> see below.

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
| X3 | EMPTY, force generation failure | Send a failing request from the intent screen | Named failure card + Try again — the first-run control case | 🟢 (BUG-035, S50) |
| X4 | DRAFT, force generation failure | Start over → send a failing request | Failure is named AND the seeded week survives (Griffin's option B) | 🟢 (BUG-035, S50) |
| X5 | EMPTY, `[E2E:FAIL_ONCE]` | Send a request whose first attempt dies | A week arrives; NO failure is ever named — the retry is invisible when it works | 🟢 (BUG-035, S50) |
| X6 | EMPTY, `[E2E:SLOW=20000]` | Stall past both attempts (bound is 2.5s in the suite) | Named failure + Try again, not a spinner — drives the REAL timeout path | 🟢 (BUG-035, S50) |

> **X3 and X4 both failed before the fix**, which is the point of them: the
> generation failure card had been unreachable on every path since it was
> written, because `useObject` reports a dead *stream* as a completed one. X1/X2
> only ever covered a *modify* failure, so nothing in five phases had asked what
> the generation path renders. See `docs/bug-tracker.md` → BUG-035.

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
| GR7 | GROCERY_READY | Drag a section by its grip, reload | Aisle order changes and **the whole order** persists across reload — asserted as the full array, and against the order *before* the drag, so a no-op drag cannot pass. **Rewritten S46 (BUG-019 quarantine threshold)** | 🟢 |
| GR8 | GROCERY_READY (3 active staples, 1 already on list) | Tap the "Olive oil" staple chip | Off-list staples show as chips (on-list garlic hidden); tap adds the item and the chip drops out of the row | 🟢 |
| GR9 | GROCERY_READY | Open the chef (brain), pick "Add stuff for taco night", send | NL→ops adds the meal's items; the chef's reply shows; items land on the list | 🟢 |
| GR10 | GROCERY_READY | Open the chef, pick "What am I out of?", send | Query-only: the reply shows, the list is unchanged (no ops applied) | 🟢 |
| GR11 | GROCERY_READY | Open the chef, type "remove the garlic", send | The item's `[N]` ref resolves to the real row and it's removed (the ID-safety path) | 🟢 |
| GR-L1 | GROCERY_PENDING_CACHED | Open Groceries; the fully-cached plan confirms | Lands on the merged list with no normalize hang; the two recipes' shared garlic is ONE row carrying the merge marker. **S52: asserts the marker's TEXT (`2 dinners`), not its presence** — the old amber dot was visible whenever `sources.length > 1` was truthy at all, so it could not fail on a wrong count | 🟢 |
| GR-L2 | GROCERY_HYDRATING_STRAGGLERS | Open Groceries mid-generation | The straggler hint names the exact remaining count ("Finishing 2 recipes…"), not a generic shimmer; the list stays hidden | 🟢 |

**Groceries: 13 passing**, 0 findings. Merge quality (canonical sums, under-merge
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
| RC11 | RECIPES_LIBRARY | Open Recipes | **The library floats nothing** — search + ＋ are in the header, and a computed-style sweep finds **zero** `position: fixed` elements under `main`. Measured rather than asserted from a class name, because "floating" IS `position: fixed` (W10, spec §12 item 04) | 🟢 |
| RC12 | RECIPES_LIBRARY | Open a recipe | The detail's one floating object is `Add to this week`, and **no dialog opens** — it never asks for a day (`3l`) | 🟢 |
| RC13 | RECIPES_LIBRARY | Open a recipe → `Add to this week` | With no week to add to, the verb **carries** the recipe to the intent screen rather than failing at a button that reads like it should work | 🟢 |
| RC14 | RECIPES_LIBRARY | Open the body-less plan draft, then a populated recipe | **BUG-038.** The empty one omits the `Ingredients`/`Steps` cards entirely and says so in one line; the populated one still renders both and shows no fallback. **Asserted in BOTH directions on purpose** — the empty half alone would also pass against a build that deleted the sections outright | 🟢 |
| RC15 | RECIPES_LIBRARY | Hold `plan.current` open with a routed delay, then release it | **BUG-037.** While the week is loading the verb reads `Checking your week…` and stays disabled; on release it resolves to `Add to this week` and enables, so the loading label cannot get stuck as the permanent one. Held by a **routed delay, not a throttle**, so the window exists on a fast machine (S50's rule) | 🟢 |

**Recipes: 13 passing**, 0 findings. Taste (does the tier split read calm now the bottom
bar is single) → Griffin.

---

## Visual-QA capture coverage (Layer A — `playwright.capture.config.ts`)
The capture harness (Claude reads the PNGs, critiques vs `docs/design/visual-qa-rubric.md`) now covers three tabs:
- **Plan** — `plan.capture.ts` (5 states; HUD-verified).
- **Groceries** — `groceries.capture.ts` (S28): ready-grouped, generating, error, manual-mode, checked-GOT-IT, chef-sheet. No HUD section → `useHud:false`, gated on readyText + facts.
- **Recipes** — `recipes.capture.ts` (S28): library, cooked-filter, drafts-expanded, create-menu, empty.
S28 gate: 0 blockers, 0 high across all 11 Groceries+Recipes states.

### `P` — the rebuilt rail (Phase 1E.5, S44)

| ID | Case | Seed | Status |
|----|------|------|--------|
| P1 | Days are containers, meals are inset rows — 15 meals across 5 day containers | `DENSE` | 🟢 |
| P2 | Only dinner carries a rationale, at every density — 15 meals → **5** gold marks (the seed gives lunch/breakfast one each, so this fails if the row prints what it is given rather than what its type may say) | `DENSE` | 🟢 |
| P3 | The meta row is one cook time and one serving count; a time-shaped tag is **dropped**, not deduped (BUG-008) | `ADVERSARIAL` | 🟢 |
| P4 | A slot with no answer is provisional, not loading: dependency sentence, no spinner, `Decide now`, and **confirm stays live** at the reduced count (BUG-009) | `PROVISIONAL` | 🟢 |
| P5 | A week is the days you chose — unplanned days are not rows; absence stated exactly once | `CHOSEN_DAYS` | 🟢 |
| P6 | Draft and confirmed are different screens — primary/`Draft`/rationales/`Start over` vs none of them + the grocery row + `Set` | `DRAFT`, `CONFIRMED` | 🟢 |
| P7 | Tapping a day opens the day sheet; a meal row inside it hands off to the meal sheet **in the same drawer** | `DENSE` | 🟢 |
| P8 | The meal sheet is a summary, not a recipe — chips ask, rows go; no ingredients, no steps (BUG-006) | `DRAFT` | 🟢 |
| P9 | The absence carries the one control that changes it (`Add days`), and a draft's gap does not | `CONFIRMED`, `CHOSEN_DAYS` | 🟢 |

### `C` — cost estimation (Phase 1E.5 W6, S44)

| ID | Case | Seed | Status |
|----|------|------|--------|
| C1 | The draft's consequence line carries the summed per-slot estimate | `DRAFT` | 🟢 |
| C2 | Never cents, always a tilde — no `$105.00`, no bare figure | `DRAFT` | 🟢 |
| C3 | A night nobody is cooking contributes nothing, and no `$0` appears anywhere | `CHOSEN_DAYS` | 🟢 |
| C4 | A partially-priced week sums what it has and says so honestly | `PROVISIONAL` | 🟢 |

### `L` — library into plan (Phase 1E.5 Slice 2, S45 + S46)

**L1–L4 (S45) cover the provenance spine and SEED a pick rather than performing one.** Deliberate, and
still true now that the picker exists: the ledger's provenance rule is a claim about *rendering*, true or
false independently of how the pick got there, and a rendering rule asserted through a five-step
interaction fails for five reasons of which only one is the rule.

**L5–L14 (S46) cover the entry points** — W8's picker and W10's `Add to this week` — and those DO perform,
end to end through the AI mock, because what they claim is a round trip: the person names the dish, the
chef names the night.

| ID | Case | Seed | Status |
|----|------|------|--------|
| L1 | A picked meal states `DINNER · PICKED` **as its whole eyebrow** — asserted on the full string, not a substring, so a badge rendered elsewhere on the card cannot pass | `PICKED` | 🟢 |
| L2 | A chef-proposed meal **in the same week** carries no provenance — the half that makes L1 mean something, since an eyebrow that never varies is decoration | `PICKED` | 🟢 |
| L3 | A picked meal's rationale argues **placement, not the dish** (§B) — catches a future generation change quietly making the chef review a recipe the person already chose | `PICKED` | 🟢 |
| L4 | The boundary is **stated, not enforced silently** — as PRODUCT COPY on the picked row (`picked-boundary`, S48/BUG-041): "Your recipe — the chef won't rewrite it." Deterministic, which is what lets an E2E spec honestly pin a guarantee the model would not reliably speak | `PICKED` | 🟢 |
| L5 | The picker opens on `Saved, never cooked` **as content**, and the chef's italic line COUNTS them (3 of 5) — a sentence saying "some" would be a sort order wearing a voice | `PICKABLE` | 🟢 |
| L6 | Browse is **honest** named doors **with counts**, and they **push**: through one, the tiles are gone and the view carries its own heading. S48: zero-count doors and doors identical to `Everything` are suppressed — the five-recipe seed shows three, and `Recently saved` is asserted absent | `PICKABLE` | 🟢 |
| L7 | A recipe that cannot fit the night **dims and says why** (3 hr vs a 30-minute night) instead of vanishing; the constraint becomes the one tile that swaps | `PICKABLE` | 🟢 |
| L8 | **No action bar until something is selected**, `Clear` likewise; the count lives in the verb, selections hold across a pushed tile — and the support line is the **receipt** naming both picks (S48), with the selected over-runner **un-dimmed** | `PICKABLE` | 🟢 |
| L9 | **The round trip** — picker → `plan.pick` → the chef's diff → `pickedRecipeId` → the eyebrow. The one spec that proves the whole chain | `PICKABLE` | 🟢 |
| L10 | A picked night says `scaled to 2` (dep 2, recipe serves 4 / household 2) — **and a chef-proposed night in the same week still says `serves`**, which is what stops "scaled to" on everything from passing | `PICKABLE` | 🟢 |
| L11 | The empty library **does not apologise**: no illustration, no "oops", search **absent** (S48 — frame `3d` omitted it), ONE honest door, and the primary is the action that works today | `EMPTY` | 🟢 |
| L12 | The picker **swaps content in one drawer**, never stacks a second — one `drawer-content` in the tree, and the page still works after close (the D3 symptom) | `PICKABLE` | 🟢 |
| L13 | A pick made **before any week exists** is held, shown, and carried into generation — the third invocation, same picker, different verb | `PICKABLE` | 🟢 |
| L14 | The survival guarantee is **stated before the ask**, on the screen whose button replaces the week | `PICKED` | 🟢 |
| L15 | Picks survive a regenerate, **performed**: the week is freshly generated and the pick is still pinned with its provenance | `PICKED` | 🟢 |
| L16 | The picker **covers the tab bar** rather than sharing the bottom edge with it — the nav occupies the bottom edge and is not what you would touch there | `PICKABLE` | 🟢 |
| L17 | **The picker's walls do not move** (S48): one measured pane height across opened → pushed → selected, and the meal sheet still content-sizes (it must NOT inherit the pin) | `PICKABLE` | 🟢 |

**L16 exists because a screenshot lied and a measurement did not (S47).** The Layer A captures appeared to
show the tab bar sitting on top of the open picker. It was the capture: the runtime grows the viewport to
content height before shooting, vaul does not reflow to that, so the sheet kept its 844-based geometry
while the fixed tab bar dropped to the new bottom. Measured at a real viewport the sheet spans 418→844,
the nav spans 779→844, and the topmost element at the nav's centre is the sheet's own tile grid. **The
pixels said "bug"; the measurement said the app was right.** The spec guards the version of this that
*would* be real: the tab bar and the drawer content are both `z-50` and the scrim is `z-40`, so the whole
thing rests on DOM order, and a refactor that portals the drawer earlier would leave `Groceries` tappable
through the sheet — D2's vaul pointer-events class in different clothes.

**L15 needed a change to the mock, and that change is the point.** `buildGenerationFixture()` took no
prompt, so it answered every generation with the same seven chef-written dinners — meaning a regenerate
that silently dropped every pick would have passed. It reads the picks block now. A fixture blind to the
input cannot test a guarantee about the input.

**Deliberately not covered, and why.** `LIBRARY_EMPTY` was planned as its own seed state and is not one:
the wipe already leaves the library empty, so `EMPTY` (L11) *is* that state, and a second name for the
same rows is the duplication the anti-duplication rule targets.

### ADVERSARIAL state (Plan, S37 — **re-pointed S44**)

> **Two of its three original findings are now EXPECTED renderings.** BUG-008's double cook time and
> BUG-009's permanent "Thinking…" are both fixed by design, so the state's day 0 and day 1 are now proof
> the rules *work* rather than proof they are broken — kept, because they are still the inputs that would
> break a naive implementation. The oversized **chip row is gone as a stress case**: the rail carries no
> chips at all, so there is nothing left for it to stress. Three cases replace it — a four-line gold
> rationale (the one place gold body text is licensed), one dense day among solo days (mixed density is
> harder to lay out than either uniform case), and a cost estimate at the top of what the validator
> admits (19900c → must still render `~$199`, never with cents).

`seedPlanState("ADVERSARIAL")` — capture-only, not a behavior-spec state. Every other
seed is well-behaved by design, so the pleasant case was the only case Layer A ever
photographed. This one makes the ugly cases deterministic: an overlong title, a slot
with no title/description/chips/tags, an overlong chip row, three near-identical
titles, and an eating-out card. Run: `npm run test:capture`.

---

## Layer-B cadence (real-model capture — `npm run test:capture:live`)
Layer A photographs the app running on **canned fixtures**. That makes it a layout and
correctness gate, and nothing more: if a fixture stops resembling what the real model
returns, every screenshot stays beautiful and every spec stays green while the shipped
product drifts. **The mock cannot detect its own drift.** Layer B is the only thing that
can, and it costs real OpenAI spend, so it runs on a cadence rather than continuously.

Precedent for why this matters: the mock relaxes the rate limiter to 1000/min, so it is
structurally incapable of catching a rate-limit regression. S30's AI fan-out slipped
past the whole E2E suite and was caught in code review instead.

**Run Layer B when any of these fire:**
1. **A fixture changed** — any edit under `src/server/ai/providers/e2e-fixtures/`. Run
   the affected tab's live capture in the same session and say so at wrap.
2. **A prompt changed** — any edit to a system prompt or prompt builder. The fixtures
   were written against the old prompt's output shape.
3. **New user-visible generated copy** — chips, chef summaries, recipe text, reply
   sentences. Layer A proves the layout holds; only Layer B proves the words are good.
4. **Phase close** — at minimum once per phase, on the phase's primary surface.
5. **Model or provider change** — a new model is a new output distribution.

**Owed today (as of S47):** **Plan ✅ (S30, S38, S40, S45, S47) · onboarding ✅ (S38, S40, S47).**
**Groceries, Recipes and You have still never had a real-model capture**, so their fixtures
remain unvalidated against live output. Clearing that backlog is one live capture per tab —
schedule it at the next phase close rather than as its own session.

**S47 added a sixth trigger, learned the hard way: a code path that ERASES ITS OWN EVIDENCE
cannot be judged from the finished screen.** `absorb-method.ts` had been unit-tested since S45
and had never once executed against a real generation — and no amount of reading the output
could tell you, because after the strip "the code ran" and "the model never repeated a method"
produce identical titles. It took one `console.log` on the server, fired only when the strip
happens, to see the path at all. **If a rule's effect is an absence, log the moment it acts.**

**S47 is also the case study for trigger #2 through a second door.** S45 fixed BUG-031 by giving
*generation* a real day map, and nobody asked whether *modify* had the same hole. It did — the
modify prompt addressed the week as `Day 0:` and supplied no weekday names at all, so the chef
wrote "Placed Congee … on **Day 0**" straight onto the Recipes detail screen and "This dish fits
perfectly on **Day 1**" onto the Plan rail. **A prompt fix is not done until every prompt that
shares the defect has been checked**, and a fix verified on one path is evidence about that path
only.

**S40 is the case study for why trigger #2 is not optional.** The `chef-system.ts` reuse rule
shipped in S39 with the full mock suite green. Layer B then found three user-visible copy
defects the mock is blind to by construction — the internal `dayOffset` vocabulary printing
"reusing olive oil from **day 0**" onto a card the user reads every week, the chef inventing
"use spinach fresh from **last shopping trip**" for a user who has never shopped, and reuse
over-generalised to pantry staples. A fixture cannot catch any of these: the fixture *is* the
old output. Two of the three would have shipped into Griffin's one real first run.
**Corollary learned the same session:** the prompt's own test was `toContain`-based rather than
an inline snapshot, so the prompt edit passed silently. A prompt guarded only by substring
assertions is not guarded against the thing you didn't think to assert.

**When you run it, compare against Layer A and report the delta** — real titles vs
fixture titles, real chip phrasing vs canned, real lengths vs seeded lengths. A
difference that would have changed a layout judgment is a finding, not a curiosity.

## Not yet cataloged (future)
- 1B recipe flows — capture / import / generate / modify (the AI-calling recipe mutations).
- Groceries — item drag-reorder (manual mode) + merge-review split interactions (unit-covered; add E2E if they regress).
- Auth: login loop / chunked-cookie regression (see whats-next).
