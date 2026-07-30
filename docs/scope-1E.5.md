# Phase 1E.5 Scope — Plan Design Buildout

> **Spoke of** [scope-v1.md](scope-v1.md). **Milestone M5.5: Plan matches the Groceries/Recipes design
> fidelity, every state accounted for.** **Must ship before 1F.** Opened S43 (2026-07-27).
>
> **Source of truth, in this order:**
> 1. `docs/design/surfaces/plan/brief.md` → **SETTLED — the decisions ledger**. That ledger is the build
>    spec. Where the brief's prose disagrees with it, the ledger wins.
> 2. `docs/design/surfaces/plan/final-direction-1.dc.html` (frames `3a`–`3e`) and
>    `final-direction-2.dc.html` (frames `3f`–`3p`) — the drawings that prove each rule, and the only
>    place the geometry lives (px, radii, insets).
> 3. `docs/design/system/design-spec.dc.html` — Design Specification v1.0, the six laws, the palette,
>    the elevation ladder. Already swept app-wide in 1E.7, so the build inherits it rather than applying it.
>
> **The gold line is the arbiter for every gold call in this build:** *gold marks the chef speaking, not
> content you read* (Griffin, S42).

---

## Why this phase exists

Plan is the signature surface — the landing screen and the one place the product's whole bet lives ("the
AI generates the UI; the user is here to react"). It is also the **only core tab never designed in the
Claude Design system-of-record.** Plan was briefed for Figma in Phase 0 and hand-built in code across 1C;
Recipes and Groceries were designed in Claude Design and imported. So Plan is materially lower fidelity
than the newest surfaces, and there was no all-states mock to hold 1F's design-system pass to.

The design pass ran S41 and landed a decisions ledger. **1E.5 is its build.** 1F then polishes the whole
system *on top of* Plan rather than re-designing it.

This is not a polish pass. It supersedes the idea-backlog's `[1F] Visual refresh: Plan to Groceries
fidelity` line.

## Griffin's calls at phase open (S43)

Three decisions were owed before this doc could be written. All three are made.

| Call | Decision | Consequence for this doc |
|---|---|---|
| **The `$94 spent` / `~$87` cost numbers** | **Scope LLM estimation now.** (Claude recommended dropping them; Griffin chose to build the estimate.) | New workstream **W6** in Slice 1. Adds a generation output, a column, and a copy call on the word "spent". |
| **Library-into-plan** | **In R1, as Slice 2 of this phase.** Confirms Griffin's S41 "that should be something that we include in R1" and gives it the scope-doc entry it never had. | Splits the phase into two slices. Pulls spec §12 item **04** forward from 1F (change-log line below). |
| **Divergence** (a confirmed week where Tuesday wasn't cooked) | **State expressible only.** The rendering lands here; the cascade does not. | An uncooked past day renders honestly (**W4**). List repair / leftover chain / re-plan → logged against 1D's deferred mid-week resync. |

**Two of the brief's four "Still open" items resolved without needing Griffin:**

- **Gold or cream for the landed ring** → **closed, and already built.** S42 ratified the gold line and
  moved the shimmer bar and the highlight ring indigo → gold under exactly that rule. The brief's
  still-open list predates the ratification. Struck.
- **Do the picker's four browse tiles push a view or filter in place?** → **push.** A pushed view carries
  its own header and count, which is what makes a tile a door; a filter chip implies subtraction from a
  list you can already see, and contradicts the ledger's "the picker is a place, not a dropdown". Push
  also avoids a second owner for the result list alongside the search field.

**One carried, deliberately unanswered:** *day sheet vs. in-rail expansion.* `1l` (the day sheet) ships
because it is a second invocation of the sheet shell we are building anyway — near-zero marginal cost.
`1m` stays held; it needs usage, not a frame. Revisit after Griffin has run a real week.

---

# Slice 1 — Plan's own states

Ledger sections **C** (modify, feedback, failure) and **D** (density, time, the bottom edge), plus the
*display* contract for a picked meal from section B. Depends on nothing in Slice 2 and is shippable alone.

## W1 · The rail — days are containers, meals are inset rows

The structural change the whole ledger rests on. Replaces today's flat vertical list of `MealCard`s.

- **Days are containers; meals are inset rows.** Fifteen meals fit the same scroll as five dinners.
- **Only dinner carries a rationale** — which is why fifteen meals still produce five gold marks, not
  fifteen. This is the mechanism that keeps the surface inside law 06 at every density.
- **A compact row cannot host the chef's voice.** At three-meal density the row carries title and meta
  only; the sentence goes to the toast (**W3**).
- **The meta row is one cook time and one serving count.** Markers like `cooks ahead` sit *above* the
  title, so they can never render as a second duration. **Closes BUG-008.**
- **A container needs contents.** Empty days are 56px rail rows with no surface. Dashed boxes are retired.
- **Titles never open with a cooking verb** (enforced in *generation*, so "Grilled Cheese" keeps its
  name), and when one method covers four or more meals the week absorbs it once and the cards drop it.
  Addresses the S40 Layer-B "seven Grilled X titles" finding. The `1y` eyebrow fix stays **rejected** —
  it collides with the provenance marker.
- **Ring geometry:** the meal row is the unit of change feedback, never the day container. The ring sits
  on the changed row's own 14px radius inside the day's 18px.

**Frames:** `3f`, `3i`, `3j`. **Touches:** `meal-card.tsx` (becomes a row), new day container, `plan-review.tsx`, `plan-midweek.tsx`, `plan-helpers.ts`.

## W2 · A week is the days you chose

- **Never a calendar with holes.** Unplanned days are not rows; the absence is acknowledged **once** at
  the bottom, with the one control that changes it.
- **Non-contiguous weeks are the normal shape**, not an edge case — "not here Mon/Tue, want Thursday and
  Friday, three dinners."
- **The night selector on the intent screen is load-bearing**: it is the *input* side of this. A
  consolidation draft dropped it and Griffin restored it (S41). It stays.

**Frames:** `3o`, `3p`, `3a`. **Touches:** `no-plan-state.tsx` (the night selector), the rail, `seed-states.ts`.

## W3 · Modify, feedback, failure

- **The acknowledgement is the rewritten rationale in place** — the only ack that survives being
  scrolled past.
- **Rows never reflow while the chef is thinking.** Errors are the single sanctioned exception:
  destructive text under a hairline with the retry beside it, the row grows, nothing above or below moves.
- **The toast occupies the action bar's exact slot and geometry** (bottom 96, height 52, radius 16,
  insets 16) so it reads as the bar *becoming* the message. It never coexists with the bar. Confirm goes
  inert while working.
- **Exactly one floating layer above the tab bar**, owned by the screen's contextual primary. No
  persistent search pill, no FAB; the toast borrows the slot rather than adding one.

**Frame:** `3k`. **Touches:** `use-plan-modify.ts`, `modify-status-pills.tsx` (becomes the toast), `bottom-bar.tsx`.

## W4 · Time — draft, confirmed, mid-week, wrapped

- **Draft and confirmed are different screens.** A draft has the decision in the floating slot with its
  consequence above it (`Saying yes writes your grocery list`). **A confirmed week has no floating action
  at all** — the decision was spent: a grocery row where the argument used to be, meta reading `Set` not
  `Draft`, the chef in the past tense, flat lighting, and cards keeping meta but losing their placement
  arguments. Scroll padding 108px, not 168px. *(Closes the S41 open question "Draft versus confirmed —
  the same week, twice".)*
- **Mid-week** keeps the shipped past/tonight/upcoming boundaries.
- **Divergence, rendering only (Griffin, S43):** a past day that was planned and not cooked renders
  honestly rather than as a lie. The cascade — grocery-list repair, the leftover chain, whether the chef
  re-plans — is **out** (see below).
- **Week-wrapped stays calm.** No confetti, no "Nice job!". The `Rate them` destination is **not** built
  here (backlog `[1E.5] Rate-the-week screen` → re-tagged 1F; see change log).

**Frames:** `3i`, `3j`. **Touches:** `plan-review.tsx`, `plan-midweek.tsx`, `week-wrapped-state.tsx`, `past-meal-row.tsx`.

## W5 · Generation is the provisional row, repeated

- **The full rail arrives in the first second** with every day and slot present, then resolves in place.
- **Progress is a count of written meals (`14 of 15`), never a bar.**
- A pending slot's sentence names its dependency (`Friday, after Wednesday`).
- **There is no separate streaming vocabulary** — the streaming view and a settled plan's unwritten slot
  are the same component.
- **A slot with no answer yet is provisional, not loading:** `rgba(240,222,190,.09)` fill, `.2` line, a
  muted sentence where the title goes, **never a spinner**. One control: `Decide now`. "Leave it to me" is
  cut (V1.5). Confirm stays live — you can confirm a week with a hole in it. **Closes BUG-009.**

**Frames:** `3g`, `3h`, `3n`. **Touches:** `streaming-plan.tsx` (largely deleted — it becomes the rail), the new row component.

## W6 · Cost estimation *(new — Griffin's S43 call)*

The design draws `~$87` on the review status row and `$94 spent` on the week-wrapped close-out. We have
no cost model, so Griffin scoped one.

**Build:**
- Per-slot estimate emitted at **generation** time (not computed client-side), so it survives `modify`
  and re-hydration. New nullable integer column on `meal_plan_slots` (cents), plus the Zod schema entry
  and the generation-prompt instruction.
- **Review screen** sums the slot estimates for the draft week.
- **Week-wrapped estimates over the confirmed grocery list's actual items**, not the plan. The list is a
  real, item-level artifact with quantities and units; the plan is a set of concepts. Same estimator,
  better-grounded input.
- **Round to the nearest dollar and never below it.** No cents, no `$86.40`. False precision is the
  failure mode that costs the most trust.
- Null-safe everywhere: an un-estimated week renders the row without the number rather than `$0`.

**⚠️ Copy call owed at build time.** `~$87` reads as an estimate — the tilde does that work. **`$94
spent` does not.** It is a past-tense factual claim about money the user actually handed over, and it is
the single most auditable string on the surface: the user has a receipt. Recommend `~$94 est.` or moving
the qualifier into the label. Will raise the exact frame when W4 reaches it.

**Not in scope:** a price database, regional pricing, store selection, or reconciliation against a real
receipt. Those arrive with grocery ordering (V2), where real line prices come back from the API.

**Touches:** `generate-plan.ts`, `plan-types.ts`, `plans.ts` schema + migration, `chef-system.ts` (the output rule), `plan-review.tsx`, `week-wrapped-state.tsx`.

## W7 · The meal sheet is a summary

- Rationale at feature size, then rows, free-text as one expanding row.
- **Ingredients and steps never enter Plan.** A `View full recipe →` link leaves for the Recipes tab.
- **Closes BUG-006** (today the sheet embeds the entire `RecipeView`).
- **Tapping a day opens the day sheet** (`1l`) — the same shell, first line and primary swapped.

**Touches:** `expanded-meal-sheet.tsx`, new day sheet, `shared/talk-to-chef-sheet.tsx` (scoping).

---

# Slice 2 — Library into plan

Ledger sections **A** (entry and the library) and **B** (the picked meal). **This is a new R1 capability**,
not a rebuild — recipes flow *into* the library four ways and nothing flows back out, so there is no way
to say "I want to cook this specific thing this week."

**The framing that keeps it on-thesis: a chosen recipe is a CONSTRAINT ON THE CHEF, not a scheduler.**
The chef still picks the night, builds around it, shops for it, and spends the leftovers.

## W8 · The picker — a place, not a dropdown

- L5 sheet at 76px, r22 top, the week visible behind it.
- Opens on **`Saved, never cooked`** as *content* with the chef's italic line on it — not a sort order.
- Browse is **four named tiles with counts** (doors), never filter chips. **They push** (S43 call).
- Search sits in the sheet header per pattern B. **No action bar until something is selected.**
- **Multi-select survives.** Selection is cream, never gold — a checkbox is the user's act. The count
  lives in the verb (`Give the chef these two`) with `The chef picks the nights` above it. The action bar
  sits at **22px inside a sheet**, not 96px — the 96px offset exists only to clear a tab bar.
- **The empty library does not apologise.** No illustration, no "oops", no disabled search. It says what
  the surface is for in the future tense, then hands back the action that works today.
- **One picker, three invocations:** intent screen, a day, a meal sheet. Only the first line and the
  primary change. A recipe that cannot fit the slot **dims and says why in its own meta** rather than
  vanishing.
- **The library door** is a 62px L2 row, last object before the fold — `Cook something I've saved` /
  `I'll build the week around it`. Unconditional, works with an empty library, droppable verbatim into
  the day sheet and the meal sheet.

**Frames:** `3b`, `3c`, `3d`, `3e`, `3a`.

## W9 · The picked meal

- **Provenance is `DINNER · PICKED`** — type, not chrome. Eyebrow plus a 10px bookmark; the meta names
  the source. No badge, no accent, no second card design. **Never a possessive** (it has to survive a
  second person in the household) — the meta carries who: `Griffin's pick · 40 min · scaled to 3`.
- **The chef answers with a night and a reason**, and **servings are said exactly once**, in the chef's
  voice, at the moment of placement — never as a bare stepper, never twice.
- **A picked meal's rationale argues placement, not the dish.** Same slot, different job.
- **The boundary is stated, not enforced silently:** *"it's your recipe, so I won't rewrite it."*
- **Picks survive a regenerate by default**, and the guarantee is stated before the ask.
- **Too many picks → two options, not three.** The queue-and-remind option is cut (V1.5).
- **One presentation that degrades — no inventory mode.** As picks accumulate the summary shifts from
  claiming the dishes to claiming *the arrangement*, and holds that at six, seven, and fifteen meals.

**Frames:** `3f`, `3m`.

## W10 · The verb, and the Recipes bottom edge

- **`Add to this week`**, in the Recipes screen's floating primary slot. It never asks for a day — the
  chef answers with the night.
- **This deletes the 1D floating search/＋ toolbar**: the FAB goes, search moves into the header, exactly
  one object floats above the tab bar.

**⚠️ Scope crossing:** that last bullet **is spec §12 item 04**, which `scope-v1` assigns to 1F and left
there on purpose so it gets its own `/visual-qa` pass. The verb cannot take the floating primary while
the old toolbar occupies it, so item 04 **pulls forward into 1E.5**. Recorded as a change-log line below
per the pull-forward rule. Item 04's remaining half (squaring the nav's top corners) stays in 1F.

**Frame:** `3l`. **Touches:** `recipe-toolbar.tsx`, the Recipes header, `recipes.capture.ts`, `recipes.spec.ts`.

---

## The five build dependencies the ledger creates

Named in `brief.md`. All five are Slice 2's, which is why Slice 1 stands alone.

| # | Dependency | Status going in |
|---|---|---|
| 1 | **Staleness detection is load-bearing, and it is cheap.** The picker opens on `Saved, never cooked` and is the only ingress, so the query must be real. | ✅ Already possible. `recipes.lastCookedAt` exists and is populated by the S27 cooked-signal harvest; `sourcePlanId` is indexed. Query: `lastCookedAt IS NULL AND sourcePlanId IS NULL`. No new column, no inference. |
| 2 | **Servings scaling is a generation task, not arithmetic** — `scaled to 3` appears in five frames. | ⬜ Generation-prompt work. Never compute it client-side. |
| 3 | **`slotType` has no value meaning "the user picked this."** | ⬜ Verified S43: the enum is `recipe \| eating_out \| skip \| leftover`. Needs a new value + migration. (`eating_out` already exists, so the going-out night in W2 is free.) |
| 4 | **A library recipe may have no `normalized_ingredients` cache**, so pinning one would hit the normalize path at confirm — the exact latency **BUG-004** exists to prevent. | ⬜ **Warm it at pick time**, not at confirm. |
| 5 | **This build touches Recipes, not only Plan** — the verb takes its floating primary. | ⬜ See W10 and the scope crossing above. |

Plus **W6's** dependency, new at S43: cost estimation needs a generation output field, a nullable column,
and a migration.

---

## Explicitly OUT of scope

| Item | Destination | Why |
|---|---|---|
| **Divergence's cascade** — grocery-list repair, leftover-chain repair, whether the chef re-plans an uncooked night | 1F / V1.5, logged against 1D's deferred **mid-week resync** | It is a behavior and data problem, not a fidelity one, and it opens the grocery pipeline mid-phase. M5.5 is a rendering bar. The *state* is expressible here (W4). |
| **Drag-and-drop to move a meal** | V1.5 | `@dnd-kit` is available (Groceries, touch-first), so this is not an architecture question — but the ledger's dated rail plus `3o`/`3p` already expresses day assignment without it. The layout must not preclude it; the interaction is not owed. |
| **In-rail day expansion (`1m`)** | Held, revisit after real use | `1l` ships. |
| **Held-recipe queue + reminder** | V1.5 | Cut from the R1 drawing (Griffin, S41). The pushback option now reads "two this week, two stay in your recipes" — no new concept. |
| **Chef deferred decisions** ("I'll settle it Tuesday night") | V1.5 | Cut from the R1 drawing (Griffin, S41). The provisional slot keeps `Decide now` only. |
| **Rate-the-week screen** | 1F | The backlog tags it `[1E.5]`, but it is a *new screen* with a bulk affordance and its own primary, not a Plan state. Re-tagged — see change log. |
| **Stale-library nudge as an intent chip** | post-1E.5 | Griffin chose the quiet door (`1b`). The staleness read moved into the picker as content. |
| **Offline / degraded** | Wave 2 / 1F | Still undrawn. The brief's own OPEN #8 is the only unanswered item on its list. |
| **Real cost data** — price DB, regional pricing, store selection, receipt reconciliation | V2 | Arrives with grocery ordering. W6 builds the estimate only. |
| **Spec §12 items 03, 05, 07** | 1F | Unchanged. Only item **04** pulls forward, and only its floating-primary half. |

---

## Acceptance criteria — M5.5

- [x] **Slice 1:** W1–W7 built in real shadcn/Tailwind on the `--spec-*` tokens. Never a paste of the
      generated `.dc.html`. **(S44)**
- [x] **Slice 2:** W8–W10 built; all five build dependencies honoured. **(W9 spine S45; W8/W10 S46.)**
      Deps 1/3/5 landed with the spine, deps 2 and 4 with the picker. Dep 3 was ratified as a **deviation**
      (a `picked_recipe_id` column rather than a `slotType` value) — see the change log.
- [x] **Every ledger bullet traces to code or to an explicit deferral in this doc.** Three §A/§B bullets are
      deferrals rather than code (the who-clause, the too-many-picks conversation, `Move it`), each with its
      reason above.
- [x] **BUG-006, BUG-008, BUG-009 closed** (their resolutions were designed in S41 and are specified in
      W7, W1, and W5 respectively).
- [x] **No regression in the shipped mechanics** (D1-D7, RG1-RG5, M1-M7, E1-E4, X1-X2, GR1-GR11, RC1-RC10).
      **591 unit + 108 E2E green (S46)**, up from the 480+78 this criterion was written against. **GR7's
      three-session flake (BUG-019) is fixed rather than quarantined**, and green in the full sequential
      run — the condition it actually failed under.
- [x] **The specs are extended for every new Plan state.** New `P`, `C` and `L` families; `L` runs to 15.
- [x] **`/visual-qa` Layer A** at 0 blockers / 0 high across every Plan state, graded against the spec's
      six laws with the gold line as tie-breaker. **(S47 — 17 Plan states + 6 Recipes states, all `ok`.)**
      Six states were captured for the first time this session, including the **meal sheet**, which had
      shipped in S44 and never been photographed at all.
- [x] **`/visual-qa` Layer B** (real model). **(S47, two rounds.)** Round 1 cleared the three guarantees
      that were on paper — **the absorption path fired live for the first time**, the named night was
      honoured, and BUG-034's split held — and found two real defects on the pick path. Round 2 verified
      **BUG-040** fixed live (the chef now names the correct weekday: it said "Sunday" and landed on
      `2026-08-02`, which is one). **BUG-041 did not verify and stays open** — see below.
- [x] **`ux-design-critic` taste pass. (S47.)** Eighteen ranked findings. **Two were correctness, not
      taste, and were fixed:** search inside a pushed tile queried the whole library while the heading
      kept naming the tile, and `Put these two on Friday` promised a placement the product cannot make
      (the `3e` invocation replaces one slot and `validateModification` dedupes by dayOffset, so two
      recipes can never both land on Friday). The remaining sixteen are **staged for Griffin's taste
      pass** rather than applied — they are design calls, and several disagree with a locked frame.
- [ ] **Griffin's taste review** — the last gate. **S48: the decisions half is done** — BUG-041 ruled
      (product copy), all sixteen critic findings disposed, two frame deviations ratified — and the
      changes are built. **What remains is his eyes on the S48 after-captures**, which is the half a
      delegated ballot cannot do.
- [ ] **Two-tier QA:** routine gauntlet + blast-radius review per slice; **deep audit at phase close** —
      1E.5 is an arc close and touches the confirm path, so the milestone audit fires automatically.

## Test coverage plan

**Existing prefixes:** `G` generation · `R` review→confirm · `M` modify · `RG` regenerate · `E` elapsed ·
`W` mid-week · `D` drawer · `X` error · `GR` groceries · `RC` recipes · `Y` you.

**New:**
- **`P` — the rebuilt rail.** Day containers with inset rows; only-dinner-carries-a-rationale at three
  densities; the meta row printing one time and one serving count; empty-day rail rows; the provisional
  slot rendering without a spinner and confirm staying live over it; the chosen-days week acknowledging
  absence once at the bottom.
- **`L` — library into plan.** Picker opens on `Saved, never cooked`; the four tiles push; multi-select
  count in the verb; no action bar until selection; the empty library; the unfittable recipe dimming
  with a reason; `Add to this week` from Recipes; provenance rendering as `DINNER · PICKED`; picks
  surviving a regenerate.
- **`C` — cost.** The review sum; the week-wrapped estimate reading from the grocery list; null-safe
  rendering with no `$0`; no cents.

**Extended:** `M` (the toast taking the action bar's slot, confirm going inert, rows not reflowing),
`E` (draft-vs-confirmed as different screens; an uncooked past day), `RC` (the Recipes bottom edge).

**New seed states** in `tests/e2e/app/seed-states.ts` (today: `EMPTY`, `DRAFT`, `MIDWEEK`,
`ELAPSED_CONFIRMED`, `ELAPSED_DRAFT`, `ADVERSARIAL`): `CONFIRMED` (now a genuinely different screen from
`DRAFT`), `PROVISIONAL`, `GENERATING`, `CHOSEN_DAYS`, `DENSE` (fifteen meals), `PICKED`, `LIBRARY_EMPTY`,
and an uncooked-past-day variant. Each gets a Layer-A capture entry in `plan.capture.ts` /
`expected-facts.ts`.

**`ADVERSARIAL` needs updating, not preserving** — two of its three current findings (BUG-008's double
time, BUG-009's permanent "Thinking…") become *expected* renderings under the new design rather than
defects, so the state must be re-pointed at what is ugly under the *new* rules.

## Known defects folded in

| Bug | What | Where it lands |
|---|---|---|
| **BUG-006** | Expanded sheet shows the full recipe, not a summary + link out | **W7** |
| **BUG-008** | Meal card prints the cook time twice, sometimes disagreeing | **W1** (meta row = one time, one serving count; markers move above the title) |
| **BUG-009** | Null-title slot renders as a permanent "Thinking…" card | **W5** (provisional, not loading) |

`BUG-005` (app-wide serif fallback) stays 1F.

## Open questions carried into the build

1. **Is tapping a day a browsing gesture or an editing one?** (S41) — `1l` ships; `1m` held. Not
   answerable from a frame. Revisit after Griffin runs a real week.
2. **The `$94 spent` copy call** — see W6. Raised at build time when W4 reaches the frame.
3. **Offline / degraded** — the brief's own OPEN #8, still undrawn. Wave 2.
4. **scope-v1's closed-beta question** — parked for 1E, closed without it, now gating 1F's shape. Not a
   1E.5 blocker but it is the next thing after this phase.

## Build status

**THE PHASE IS CODE-COMPLETE (S46) — every workstream W1–W10 is built.** Branch
`session-43-1e5-plan-rebuild`, worktree `../meal-app-1e5`.
**591 unit + 108 E2E green, lint + typecheck clean, migrations `0007` + `0008` applied.**
**GR7 is green in the full sequential run** — BUG-019 was fixed rather than quarantined at its third
recurrence, and it is now verified in the exact condition it failed under rather than only in isolation.
What remains are gates (visual-QA on Slice 2's states, Layer B on the pick path, the critic, Griffin's
taste), not features.

| WS | State | Note |
|---|---|---|
| **W1** rail | ✅ | `rail-helpers.ts`, `rail/meal-row.tsx`, `rail/day-container.tsx`, `rail/plan-rail.tsx`. **BUG-008 closed** (gated by `P3`). |
| **W2** chosen days | ✅ | `groupIntoDays` + `unplannedSpan`; the closing line and its one control. Gated by `P5`. |
| **W3** modify/toast | ✅ | `use-plan-modify` derives ONE `toast` (error → working → ack); the slot renders the toast **or** the primary, never both. `modify-status-pills.tsx` **and** its now-orphaned `bottom-bar.tsx` deleted. **Closed BUG-029** on the way. |
| **W4** time states | ✅ | Draft/confirmed/mid-week/wrapped all on the rail's vocabulary. Wrapped keeps its in-place thumbs because the `Rate them` destination is 1F. |
| **W5** generation | ✅ | `streaming-plan.tsx` is the rail + `CountSlot`. **BUG-009 closed** (gated by `P4`). |
| **W6** cost | ✅ **CLOSED (S45)** | `est_cost_cents` + migration `0007`, Zod → validator → `toSlotValues` → `DisplayMeal` → the review sum, prompt rule, four assertions, gated by `C1`–`C4`. **The week-wrapped half is descoped, not owed** — Griffin's S45 call was to drop the number from wrapped entirely and keep cost on review (see change log). Wrapped rendering no cost is now the intended state rather than a gap. |
| **W7** meal sheet | ✅ | **BUG-006 closed.** One `PlanSheet` drawer, two subjects; `sheet-parts.tsx` is the shared shell. Day sheet (`1l`) ships. Gated by `P7`/`P8`. |
| **W9** picked meal | ✅ **(S46)** | Spine landed S45 (`picked_recipe_id` + migration `0008`, `DINNER · PICKED` derived from data, `L1`–`L4`). **S46 completed it:** picks are now creatable, §B's servings line renders as `scaled to N` (and *only* where the chef actually scaled — `serves N` otherwise), the boundary sentence comes from the chef, and picks survive a regenerate for real (`L15`). ⚠️ **The who-clause (`Griffin's pick`) is deliberately NOT built** — see the deferral note below. |
| **W8** picker | ✅ **(S46)** | A **third subject on the existing `PlanSheet`** as settled — one drawer, content swapped in place. `picker-helpers.ts` (pure: tiers, tiles, fit, verb) + `picker-content.tsx` + `LibraryDoor` in `sheet-parts.tsx`, dropped verbatim into all three invocations. Server: `plan.pick` on `applyPlanChange`, a `[N]`-ref `pickedRef` in both AI schemas, and picks carried through generation. Gated by `L5`–`L15`. |
| **W10** verb + Recipes edge | ✅ **(S46)** | Both halves. **Detail:** `Add to this week` as the one floating object; it never asks for a day, and with no week to add to it carries the recipe to the intent screen rather than failing. **Library:** `recipe-toolbar.tsx` **deleted**, search into a new `recipe-header.tsx`, `＋` a 44px icon button beside it. Gated by `RC11`–`RC13`, where RC11 measures `position: fixed` rather than trusting a class name. |

**Gates:** unit ✅ · E2E ✅ · `P`/`C`/`L` specs ✅ · seed states ✅ · `ADVERSARIAL` re-pointed ✅ ·
`/visual-qa` Layer A ✅ (Slice 1 **and** Slice 2, S47) · Layer B ✅ (Slice 1 **and** the pick path, S47) ·
critic ✅ (S47) · **Griffin's taste ⬜ — the only gate left.**

### Three things W8/W10 did NOT build, stated rather than discovered (S46)

1. **§B's who-clause (`Griffin's pick · 40 min · scaled to 3`) is not built.** The meta renders
   `40 min · scaled to 3`. The clause needs a display name for the person who picked, and R1 has no such
   surface — household sharing UI is V1.5, and the rule exists *because* a second person will one day be
   in the household. Inventing a name source to render "Griffin's" for a solo user would be building the
   V1.5 feature's hardest half for zero present value. **Owed with household sharing.**
2. **§B's "too many picks → two options" (frame `3m`) is not built.** `MAX_PICKS_PER_ASK` is 4 and the
   picker will happily hand the chef four; what does not exist is the *conversation* — the pre-selected
   recommendation and its alternative. It is a distinct screen with its own primary, and it only fires on
   a week the chef judges over-constrained, which needs a judgement the chef is not currently asked for.
   **Logged to the backlog, not silently skipped.**
3. **`LIBRARY_EMPTY` did not become a seed state.** The wipe already empties the library, so `EMPTY` is
   that state; a second name for identical rows is duplication. See test-plan.

### What Layer B found (S45) — the gate earned its keep for the third phase running

Three rounds, nine real generations. **Four defects, none of them visible to the mock**, and one of them was
caused by the previous Layer B's own fix:

- **BUG-030** — the Layer B capture spec was the one Plan file S44's migration missed, so round 1 paid for
  three real generations and threw them away against a deleted hero. It is the only spec in the suite whose
  staleness costs money instead of a red test.
- **BUG-031 🔴** — "Uses the leftover fresh dill from **Monday**" printed on a Thursday, in a week with no
  earlier Monday and no dill on the one it named. **S40's fix caused it**: telling the model to use weekday
  names without ever telling it the weekdays meant it mapped `dayOffset` onto a Monday start. Fixed
  structurally by sending a real day map; verified correct live.
- **BUG-032** — the reuse rule had colonised the chef's voice, 7 of 7 rationales arguing waste. Capped at
  two; down to 2 of 7 live.
- **BUG-033** — W1's title rule was **marked ✅ here and never written into generation**. The four-or-more
  half now lives in code, because round 2 proved a prompt clause loses to an explicit "I want to grill"
  (seven of seven "Grilled X", S40's finding verbatim).

**W6's estimates, judged rather than counted:** 63/63 slots priced across nine weeks, zero nulls, no
clamping. The *ranking* is stable and correct — salmon the most expensive night in every week, priced at
exactly $12.00 in three independent runs; chickpea stew and fried rice cheapest. The *level* is soft:
week sums ranged **$44–$74** for seven dinners for two across runs of the same prompt, and the low end is
roughly 30% under a real shop. Under-estimating is the worse direction. Two cheap levers if Griffin wants
them: price the whole meal rather than the headline protein, and name the servings count in the cost
instruction. Not a blocker — the review row is honest about being an estimate.

### What Layer B found (S47) — the gate earned its keep for the FOURTH phase running

**Two rounds. Three guarantees cleared, two real defects found and fixed, both verified live.**

**Cleared — and one of these had been owed since S45:**

- **The absorption path fired live for the first time.** `[plan] absorbed a repeated method from 4 titles`,
  and `live-grill` came back with **zero** method-opening titles while the claim read *"Five grilled
  dinners this week"* — the week owning the method once, exactly as W1 specifies. `absorb-method.ts` had
  been unit-tested against round 2's output since S45 but **had never executed on a real generation**.
  A one-line server log was needed to see it at all, because absorption erases its own evidence: after
  the strip, "the code ran" and "the model never repeated a method" look identical.
- **A named night is honoured.** `asked=2026-07-31 landed=2026-07-31`. Frame `3e`'s primary is not a lie.
- **BUG-034's split holds on the real model.** Claims came back at **76–89 characters, one sentence**;
  the first meal now sits ~210px down a 390×844 screen, so three meals are visible where the original
  defect showed none.

**Found — both on the pick path, both prompt-shaped, neither visible to the mock:**

- **BUG-040 🔴** — the chef wrote **`Day 0` / `Day 1` straight to the user**. This is BUG-031's exact
  defect through a second door: S45 gave GENERATION a real day map and nobody asked whether MODIFY had
  the same hole. It did. The model was echoing the only day vocabulary the prompt gave it.
- **BUG-041 🟠 — still open, and the honest result of this gate.** §B's boundary sentence was requested
  **"in your summary"**, and the pick path returns `chefResponse`; no such field exists there. The rule
  was in the prompt, aimed at nothing. The prompt now names the real fields and a test pins it — but
  **round 2 produced the sentence zero times as well**, so it stays a guarantee on paper. Recommendation
  is BUG-033's precedent: stop asking. A style clause competing with six other instructions loses, and
  the boundary is a fixed product promise rather than a creative act. **Griffin's call**, because it
  moves a sentence out of the chef's voice and into the product's.

**Also worth knowing, not a defect:** the `chefNote` half runs long — 203 to 336 characters, where the
prompt asks for one or two sentences and the model wrote two or three. It renders as four to six lines
of italic gold. The week is scannable now, so this is a **voice/taste call rather than a fix**: tightening
it costs the chef some range, which is the same trade Griffin already decided once on BUG-034.

### What the PHASE still owes (S46 — every workstream is built)

1. **`/visual-qa` Layer A on Slice 2's states** — the picker (opened, a tile pushed, multi-select, the
   empty library), a picked row on the rail, and the Recipes bottom edge on both screens. Slice 1's Layer A
   cleared at 0/0 in S44 and none of it was touched.
2. **A Layer B round on the pick path.** Two things are guarantees on paper: the chef obeying a named
   night, and it stating the boundary in its own words. Both are prompt-shaped, and the S40/S45 precedent
   is that prompt-shaped guarantees fail on the real model in ways the mock cannot show. **Still owed from
   S45:** the absorption path (`absorb-method.ts` is unit-tested against round 2's exact output, but round
   3 produced no method-opening titles, so the code has never fired live).
3. **BUG-034 wants Griffin's decision** — see the read in whats-next. The seeds now carry a realistic
   summary, so Layer A can finally see the class even before the call is made.
4. **The `Move it` group** (`Move to another day` / `Skip tonight`) is drawn in wave 1's meal sheet and is
   in none of W7's scope bullets; drag-to-move is explicitly V1.5 and `Move to another day` needs a day
   picker that is neither drawn nor scoped. **Deliberately not built.**
5. **`ux-design-critic` pass, then Griffin's taste review.**

### What Slice 1 still owed (S45 — all but BUG-034 now closed)

1. ~~`/visual-qa` Layer A, then Layer B~~ — **both done.** Layer A cleared 0 blockers / 0 high (S44);
   Layer B ran three rounds in S45 and is written up above.
2. ~~W6's week-wrapped half.~~ **Descoped by Griffin (S45)** — the number comes off wrapped entirely, so
   there is no grocery-list query to write and no copy call left open. Wrapped rendering no cost is the
   answer, not a gap.
3. **A Layer B re-run is owed once, on the absorption path.** `absorb-method.ts` is unit-tested against
   round 2's exact seven-title output, but round 3 produced zero method-opening titles so **the code path
   never fired live**. It is a guarantee on paper until a live "I want to grill" walks through it.
4. **BUG-034 (the six-line chef summary) wants a decision before Griffin's taste pass** — it is the first
   thing he will see on a real week, and the seeds cannot show it to him.
5. **The `Move it` group** (`Move to another day` / `Skip tonight`) is drawn in wave 1's meal sheet but
   is in none of W7's scope bullets; drag-to-move is explicitly V1.5 and `Move to another day` needs a
   day picker that is neither drawn nor scoped. **Deliberately not built** — logged here rather than
   quietly added.

### Findings the rebuild owed, found by migrating the specs

The spec migration was not bookkeeping — it surfaced five defects, four of them invisible from the code
alone. **BUG-025** (the floating slot was `absolute`, so the confirm bar scrolled away on a seven-day
draft), **BUG-026** (the draft's regenerate door was dropped entirely), **BUG-027** (§D's scroll padding
was never built), **BUG-028** (deleting the hero left the Plan tab with no heading at all), **BUG-029**
(a failed modify became unreachable once you dismissed the sheet). All five fixed. This is the argument
for the "migrate before you build further" ordering, in evidence.

## Change log

| Date | Change | Why |
|---|---|---|
| 2026-07-30 (S48) | **Griffin's taste pass, executed as a decision ballot: BUG-041 accepted (boundary → product copy on the picked row), eleven of the critic's sixteen findings applied, two rejected, four retagged 1F.** Two locked-frame deviations ratified: the picker pane pins at ~80vh (not §A's 76px), and `3e`'s support line acknowledges an overrun pick. The day sheet's library door moved with the meal sheet's — one shell, one grammar. New `L17` pins the pane; L4/L6/L8/L11 rewritten; picker unit tests extended. | Griffin could not see the captures and delegated to the recommendation ballot ("if we need to flex the frames, that's fine — the spec didn't know everything we would ever do"). Full dispositions in decisions.md S48; his visual confirmation lands on the S48 after-captures. |
| 2026-07-29 (S46) | **`3e`'s named night is HONOURED, not treated as a hint.** When the picker is opened from a specific meal, `plan.pick` tells the chef to put the recipe on that night; every other invocation sends no day and the chef chooses. | Caught mid-build as a contradiction I had written myself. §B says "the chef answers with a night", and I had implemented that unconditionally — but `3e`'s primary reads **"Put it on Thursday"**, and tapping Thursday's dinner only to have the chef move it elsewhere makes that button a lie. The rule and the frame are not in conflict once you read which invocation each describes: `3b` (intent screen) captions "The chef picks the nights"; `3e` names one. The chef still owns the rest of the week in both. |
| 2026-07-29 (S46) | **The E2E generation fixture now reads the prompt.** `buildGenerationFixture()` took no arguments and returned the same seven dinners for every request. | Required to test §B's "picks survive a regenerate" at all. A regenerate that silently dropped every pick would have passed against a prompt-blind fixture — the fixture cannot verify a guarantee about an input it never sees. This is the same class of gap as BUG-030 (a stale capture spec) and the S40 prompt test that passed silently: **the apparatus has to be able to fail.** |
| 2026-07-29 (S46) | **`GrocerySection` gained `data-dragging`** — a test hook in product code, deliberately. | BUG-019's real cause was a race the suite could not see: with no `DragOverlay` in this build, "the drag is live" existed only as an opacity class, so a pointer-driven test had to guess when `@dnd-kit` had measured its droppables. Asserting on `opacity-40` would couple the suite to styling; exposing the state itself is the smaller commitment and the honest one. |
| 2026-07-29 (S45) | **W6's week-wrapped cost is DESCOPED — the number comes off wrapped entirely.** Cost now lives only on the review consequence line and the confirmed week's grocery row, both of which say "estimate" in their own words. W6 → closed. | Griffin's call, taking the recommendation. The asymmetry decides it: a forecast cannot be falsified, but `$94 spent` is a past-tense claim about money already handed over, and it is the one string in the product the person can check against a receipt in their pocket. Review needs the number (it is an input to a decision); wrapped is a recap, and a cost figure there invites arithmetic instead of reflection. Side effect: the grocery-list query the wrapped half needed is no longer owed. |
| 2026-07-29 (S45) | **DEVIATION from build dependency 3: provenance is a nullable `picked_recipe_id` column, NOT a new `slotType` enum value.** A picked slot stays `slotType: "recipe"`; the `DINNER · PICKED` eyebrow derives from the column. Migration `0008`. | Griffin ratified. Three reasons, in order of weight. (1) **The enum value is dangerous**: `slotType === "recipe" \|\| slotType === "leftover"` is duplicated in **eight** places across client and server, two of them in the grocery collector — miss either and a meal the person *deliberately chose* silently never reaches the shop. A column changes none of the eight, because they all already include `"recipe"`. (2) **The column is needed anyway**: W9's "picks survive a regenerate" must re-pin *which* library recipe, and dependency 4 must warm *that* recipe's normalize cache — `recipeId` cannot serve, since hydration owns and overwrites it. An enum value carries no identity. (3) **The ledger is unharmed**: "provenance is type, not chrome" is a rendering rule about the eyebrow stating it the way it states DINNER, and it renders identically either way. The eight-way duplication is logged as its own cleanup rather than fixed here, since nothing now depends on it. |
| 2026-07-29 (S45) | **Slice 2 split: W9's spine landed, W8/W10 did not.** Layer B found four real defects and fixing them took the session. | Deliberate, and stated rather than discovered: the picker is the *entry point* to a provenance model, and landing the model first means W8 arrives next session against `L1`–`L4` that already exist. Shipping both at once would have meant finding out which half was wrong with no coverage on either. |
| 2026-07-27 (S43) | **Doc created; 1E.5 opened.** Split into **Slice 1** (Plan's own states, W1–W7) and **Slice 2** (library into plan, W8–W10). | Slice 1 depends on nothing in Slice 2 and is shippable alone; two reviewable `/visual-qa` passes beat one unreviewable diff — the same argument that split 1E.7 out of 1F. |
| 2026-07-27 (S43) | **Library-into-plan formally enters R1 scope** as Slice 2, resolving the open question raised S41. It had been designed in full but never written into a scope doc. | Griffin's S41 words — *"That should be something that we include in R1"* — reaffirmed at S43. Recipes flow into the library four ways and nothing flows back out; the data spine (`meal_plan_slots.recipeId` → `recipes`) already supports it, so it is UI + a generation-prompt change, not a schema project. |
| 2026-07-27 (S43) | **PULL-FORWARD: spec §12 item 04's floating-primary half moves 1F → 1E.5.** The `Add to this week` verb takes the Recipes screen's single floating primary, which requires deleting the 1D search/＋ toolbar and moving search into the header. Squaring the nav's top corners stays in 1F. | Required by the pull-forward rule in scope-v1. The verb cannot occupy the floating slot while the old toolbar is in it — the two are the same pixel. Sequencing them apart would mean building the Recipes bottom edge twice. |
| 2026-07-27 (S43) | **Cost estimation (W6) added to Slice 1** — per-slot LLM estimate at generation, summed on review; week-wrapped estimates over the confirmed grocery list. | Griffin's call at phase open. Claude recommended dropping the numbers (no cost model; an LLM estimate is ungrounded and the one figure on the screen a user can audit against a receipt; real prices arrive free with V2 grocery ordering). Griffin chose to build it. Scoped with rounding and null-safety guardrails, and grounded on the grocery list rather than the plan wherever a list exists. |
| 2026-07-27 (S43) | **Divergence scoped to rendering only.** An uncooked past day renders honestly; the cascade is out. | Griffin's call. Not cooking a planned night is the *normal* case, but its consequences are 1D's deferred mid-week resync wearing a different hat, and M5.5 is a rendering bar. Expressing the state now prevents a layout that cannot say it later. |
| 2026-07-27 (S43) | **Two of the brief's four still-opens closed without Griffin:** the landed ring (gold — already ratified and built S42) and the picker's four tiles (push). **Rate-the-week re-tagged `[1E.5]` → `[1F]`** in idea-backlog. | The ring was settled by the gold line a session after the brief was written. The tiles had a recommendation the ledger's own logic forces. Rate-the-week is a new screen with its own primary, not a Plan state — it does not belong to a fidelity rebuild. |
