# Plan tab — all-states design brief (Phase 1E.5)

> **Status: OPEN — this is a to-generate brief, not a build spec.** Written S38 (2026-07-25) to kick off the
> Claude Design pass for **Phase 1E.5 (Plan Design Buildout)**, which gates 1F.
>
> **⚠️ REVISED S40 (2026-07-27): the palette section below was written before Design Specification v1.0
> existed and pointed this pass at a palette the codebase has since retired.** If a design was already
> generated against the original text, it is in the wrong colours and should be regenerated. See the
> Palette bullet under "Hard constraints".
>
> **Read first, in this order:** `../../system/design-spec.dc.html` (**Design Specification v1.0 — canonical;
> the six laws, the palette, the elevation ladder, the orb**) → `../../PROJECT-CONTEXT.md` (the system as it
> stands, including which surfaces are migrated and which are not) → this file. `../../Guidelines.md` is
> **superseded** — read it for the anti-pattern list only and ignore its colour values. For the surfaces this
> one connects to: `../onboarding/brief.md` + `../onboarding/brief-reflect-playback.md` (the hand-off into
> Plan, and the **only migrated worked example** — match its treatment) and `../groceries/brief.md` (the
> fidelity bar to beat, but note it is still on the pre-spec palette).

---

## Why this pass exists

Plan is the **signature surface** — the landing screen and the one place the product's whole bet lives ("the AI
generates the UI; the user is here to react"). It is also the **only core tab never designed in Claude Design.**
Plan was briefed for Figma in Phase 0 (`../../brief-plan.md`, `../../brief-plan-states.md`) and hand-built in
code across 1C; Recipes and Groceries were designed in Claude Design and imported. So Plan is materially lower
fidelity than the newest surfaces, and there is **no all-states mock to hold the 1F design-system pass to.**

1E.5 fixes that: design **every** Plan state from scratch, beautifully, then rebuild Plan in real components to
that bar. 1F then polishes the whole system *on top of* Plan rather than re-designing it.

**This is not a polish pass.** It supersedes the old `[1F] visual refresh Plan to Groceries fidelity` line. It is
a from-scratch exploration of the most important screen in the product.

## Pass shape (recommended)

**Deep pass — 2 directions, then converge.** Plan is the emotional centerpiece and the state count is high, so
two genuinely different takes are worth the iteration; a third would mostly re-mix. Suggested poles:

- **Direction A — "The chef's proposal."** The week reads as a written recommendation with the chef's voice
  running through it. Rationale lines and summary carry real weight; the cards feel like an argued case.
- **Direction B — "The week, assembled."** The week reads as a composed object you manipulate — day-anchored,
  spatial, moveable. Leans into the dynamism thread below (day assignment, drag/move, going-out nights).

They are not just skins: A optimizes for *trust in the proposal*, B optimizes for *control over the week*. The
right answer is probably a merge, which is exactly why two poles beat one hedge.

---

## The state inventory — design every one of these

Fifteen states. Grouped by the arc a real week actually takes. "Shipped today" describes what exists in code so
the design has an honest starting point; **none of it is a constraint on the design** unless it appears under
SETTLED.

### A. Getting a week started (the three front doors)

**1 · Intent — empty (first door).** No plan exists. A headline ("What are you thinking this week?"), a
free-text field, and five tappable suggestion chips (`Healthy weeknight dinners`, `I want to grill`,
`Kid-friendly meals`, `Use what's in my fridge`, `Dinner party Saturday`). This is the closest the app comes to a
blank state, and the hard constraint says it must never *feel* like one — the chips are the proposal.
*Open:* does the chef pre-propose a week here rather than asking? Can this screen show what it already knows
about you (the You-tab constraints) so the user sees the plan is already personalized before generating?

**2 · Intent — pre-seeded from onboarding (third door).** The same screen, arriving straight out of the
first-run interview, carrying an eyebrow (`YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME`), a different headline
("Here's what I'll cook around."), and **seed chips** showing the constraints just captured (e.g. `Pescatarian`,
`No cilantro`, `30 min weeknights`, `2 adults + 1 toddler`). This is deliberately the *real* intent screen
pre-filled, not a bespoke onboarding step — one architecture, three front doors.
⚠ **This screen is under live taste review in the 1E close (S38).** Design it as-built; if its copy or chip
treatment changes this session, the change is small and lands as a note here.
*Open:* how seed chips read as *editable* constraints vs. static labels. The onboarding brief's dinners
stepper + lunch/breakfast toggles were **deliberately not built** (R1 generates dinners only) — the design
should not reintroduce dead controls, but **may** propose what an honest "how many dinners this week" control
looks like if the dynamism thread makes it real.

**3 · Intent — re-prompt over an existing plan (second door).** Same screen reached from "Start over" (draft) or
"Plan a new week" (confirmed), plus a `← Keep current plan` escape and, over a confirmed plan, a replace
warning. There is deliberately **no confirm dialog** — this screen *is* the airlock.
*Open:* how the replace warning carries weight without a modal.

**4 · Chef proactive clarification — NEVER BUILT, design it now.** The chef asks *the user* a question before or
during planning: "You said 'plan my week' — you're out Tuesday and Thursday, so three dinners?" Answered with
**tappable option cards** plus a free-text escape. The S8 interaction paradigm reserved this slot ("Tertiary
(10%): structured multi-turn clarification through tappable option cards") and it was never built — a genuine
gap. It must be **general**, not hard-coded per scenario: one layout that can carry any clarification the model
raises.
*Open:* everything. Does it interrupt generation, precede it, or arrive as a card inside the streaming view? How
does the user dismiss it and just let the chef decide?

### B. Generation

**5 · Streaming / generating.** Meals arrive progressively as the model streams. Today: a chef summary appears,
then meal cards fill in. This is a ~20-40s window on the app's highest-stakes action and it deserves real design
attention — it is the moment the product proves it's working.
*Open:* what fills the wait honestly (no fake progress bars). Does the chef narrate? Do skeleton cards carry the
day labels so the week's shape appears before its content?

**6 · Generation error.** Generation failed with no plan to fall back to. Needs a real fallback UI with retry —
never a blank screen. *Open:* how the chef owns a failure in-voice without apology theater.

**7 · Loading (returning user, plan being fetched).** Brief skeleton state. Low novelty, but design it so it
doesn't flash as a broken screen on a cold load.

### C. The week itself

**8 · Review (draft).** The generated week, unconfirmed. A chef summary at top ("Built around your busy Thursday
and a grocery run Sunday"), a vertical list of meal cards, and a confirm action that produces the grocery list.
This is the screen the whole 10-minute ritual funnels through.
*Open:* how confirm reads as the consequential action it is (it generates the grocery list) without a heavy CTA
bar. How the summary and the cards divide the chef's voice.

**9 · Confirmed (start of week).** Same week, locked in. The affordance shifts from "review this" to "here's
what's coming." *Open:* how much visual change confirmation earns — the hard constraint says a Sunday view and a
Wednesday view should look **meaningfully different**, so a draft and a confirmed week probably should too.

**10 · Mid-week.** The Wednesday-evening view. Past days (with thumbs feedback), tonight (elevated), upcoming
days. The single best proof of "dynamically assembled, not templated."
*Open:* how far the reorganization goes. Is tonight a hero card? Does the past collapse? What does "tonight" look
like at 6pm vs. 10am on the same day?

**11 · Week wrapped / elapsed.** Every day is in the past. Today shows a recap with thumbs and a "Plan next week"
action. *Open:* calm completion with zero celebration (no confetti, no "Nice job!") — this is a hard register
constraint and it is easy to violate here.

### D. Meal-level surfaces

**12 · Expanded meal sheet — SUMMARY, not the full recipe.** Tapping a card opens a bottom sheet. Today it
embeds the entire `RecipeView` (ingredients + steps) — **BUG-006**, and the fix is a design call, not a patch.
Griffin wants a **summary card**: key info, the "why this day" rationale, the AI action chips, and a
**"View full recipe →"** link out to the Recipes tab. Design the summary/full split.

**13 · Talk to the Chef sheet.** The free-form input surface, opened week-scoped or scoped to one meal (the
headline changes: "Change Tuesday's dinner"). Suggestion pills above the field, contextual to the state. Note
the hard constraint: this is a **sheet you open**, never a persistent chat bar or a floating AI button.
*Open:* how scoping is made visible. How pills stay contextual without feeling like canned replies.

**14 · Modify — working / landed / error (the affordance trio).** The most-used interaction on the surface,
built in 1C and worth re-designing at the new fidelity:
- **Working:** the affected card dims with a shimmer and a label ("Reworking Tuesday's dinner…"); sheets stay
  open and show pending. Scroll-independent — no top-of-page toast.
- **Landed:** new content arrives with a one-shot highlight ring; a bottom ack pill carries the chef's sentence
  and taps to scroll to the changed day.
- **Error:** a bottom pill, "That didn't take — try again?" with a reachable Retry; in a sheet, the sheet stays
  open with a retry line.

**15 · Offline / degraded.** No network, or the AI is unavailable. Today: unhandled. *Open:* what a confirmed
week looks like with no connection (the plan is local data — it should still be readable), and how the chef's
absence is communicated honestly.

---

## The dynamism thread — Griffin's biggest ask for this surface

Consolidated from S35. The plan should **reshape to the user's real week**, not enforce a rigid "your meals this
week." The design must account for this, not just the happy path:

- **Which day does each meal land on** — explicit, visible day assignment, not an implied ordered list.
- **Going-out nights / skipped days** — a first-class card state, de-emphasized but present ("Eating out — no
  plan needed"), not a gap in the list.
- **Move a meal to another day** — by voice, by tap, and by **drag-and-drop**. The app already standardized on
  `@dnd-kit`, touch-first, in Groceries — so drag is an available primitive, not a new architecture.
- **Non-contiguous weeks** — "not here Mon/Tue, want Thursday and Friday, three dinners." The week is a set of
  chosen days, not seven slots.
- **The dependency logic that implies** — leftovers that move with their source meal (Friday→Saturday), a meal
  pushed several days out, whether the groceries still hold.

Not all of this ships in the 1E.5 *build*, and the brief is not committing it to R1. But the design must not
paint us into a layout that can't express it, and where a state is cheap to design now it should be designed now.

---

## Real data to populate the designs

Use this content. Do not generate "Recipe 1 / Meal A" placeholders — the design lives or dies on whether the
chef's output reads well.

**Chef summary (draft week):** "Built around your busy Thursday and a grocery run Sunday. Two make-aheads so
Wednesday cooks itself."

**The week:**

| Day | Meal | Rationale line (chef voice, accent-colored, trailing →) | Meta |
|---|---|---|---|
| Sunday | Miso-Glazed Salmon with Bok Choy | Fresh fish right after Sunday shopping — best window. | 35 min · serves 2 |
| Monday | Sheet-Pan Chicken Shawarma with Cucumber Yogurt | Roasts extra chicken for Wednesday. | 45 min · serves 4 |
| Tuesday | Beef and Broccoli Stir-Fry | Twenty minutes, because Tuesday. | 20 min · serves 2 |
| Wednesday | Leftover Chicken Salad Wraps | Monday's chicken, no second cook. | 15 min · serves 2 |
| Thursday | *Eating out — no plan needed* | You said Thursdays are out. | — |
| Friday | Cast-Iron Steak with Roasted Potatoes | The one night you've got the time. | 50 min · serves 2 |

**Per-card AI action chips (imperatives, always):** `Make it lighter` · `Swap the protein` · `Something faster`
· `Make it spicier`

**Talk-to-Chef suggestion pills (week-scoped, draft):** `Make Thursday lighter` · `I want to grill this weekend`
· `Swap the salmon` · `Show me the grocery list`

**Talk-to-Chef pills (mid-week):** `What can I prep for tomorrow?` · `Got more leftovers — any ideas?` ·
`Move Friday's steak to Saturday`

**Ack pill copy (modify landed):** "Swapped Tuesday for a 20-minute stir-fry."

---

## OPEN — iterate here

1. **Day assignment + the moveable week** (the dynamism thread). The single highest-value open question.
2. **The clarification state** (#4) — a general, non-hard-coded layout for the chef asking *you* something.
3. **Draft vs. confirmed vs. mid-week differentiation** — how far the same week visually re-composes as it ages.
4. **The expanded meal sheet's summary/full split** (BUG-006).
5. **A stack of seven titles that all start with the same word (new, S40).** Layer B on the "I want to grill"
   intent returned seven dinners *every one* of which was titled "Grilled …". The week underneath was
   genuinely varied (7 distinct proteins, 7 distinct dish forms) and the intent was explicitly grilling — so
   this is a **titling and layout** problem, not a variety problem, and no prompt fix is owed. But as a
   scannable column of cards it reads as a wall of one word, and the review screen is where the plan has to
   *look* varied at a glance. Design for it: the card may need to lead with the dish's distinguishing noun,
   or push the shared method down into the tags where repetition is honest and cheap. Evidence:
   `tests/e2e/captures/B-2026-07-27T02-51-29-888Z/live-grill.png`.
6. **The card meta row.** BUG-008: today it prints the cook time twice (`estTimeMinutes` plus a time-shaped tag →
   "30 min · serves 2 · seeded · 30 min", and worse when they disagree: "95 min · … · 90 min"). The fix is a
   display decision this pass should make — what belongs in a meta row at all, and where tags go.
7. **The null-title card.** BUG-009: a slot with no title currently renders as the permanent "Thinking…" state —
   a settled plan showing a card that loads forever. Design an explicit empty/error card so that state is
   *expressible*; whether it's reachable in production is a separate build-time call.
8. **Streaming** — what honestly fills a 20-40s generation.
9. **Offline/degraded** — currently unhandled.
10. **How the grocery hand-off reads** — confirming a plan produces the list; today that consequence is quiet.

## SETTLED — don't touch (drift here is noise to correct, not a decision)

- **All PROJECT-CONTEXT tokens, glass surfaces, type scale, register.** Dark-only. 430px phone form factor.
  lucide icons. Eyebrow all-caps is the one sanctioned all-caps use.
- **⚠️ Palette — THIS PARAGRAPH WAS REWRITTEN S40. The version you may have already generated against was
  wrong.** The palette is **no longer provisional and no longer a 1F decision**: **Design Specification v1.0
  ("Gold voice, cream hand", `../../system/design-spec.dc.html`, theme 11i) landed in S39 and is canonical.**
  Design Plan against **the spec**, not against the shipped Plan screens — Plan is still on the retired
  palette until phase **1E.7** sweeps it, so the current screens are the "before". Concretely: floor
  **`#0F0B08`** (not `#0E0E10`); **gold `#E9B348` is the chef and ONLY the chef** (orb, presence dot, active
  tab, the chef's italic rationale); **cream `#F4EBDC` is every action** — **the indigo `#3A86FF` accent is
  RETIRED**, which for this surface means the "Looks good →" CTA, the seed chips, the submit control and the
  active tab all change hue. Warm every neutral (`rgba(240,222,190,x)`, never `rgba(255,255,255,x)` — law 04).
  Plan takes the **`light.ambient`** wash. Obey the six laws and the elevation ladder in PROJECT-CONTEXT;
  **onboarding is the migrated worked example — match it.**
- **⚠️ Open question that is an INPUT to this pass, not an afterthought (S40):** how much gold the *content*
  layer may carry. Law 06 caps it at three marks per viewport and law 03 forbids accent-coloured type you
  read twice, but the S39 reflect screen renders its whole `SO HERE'S YOUR WEEK` block in gold body text.
  Plan has the same shape (per-card chef rationale, ×7). **Griffin owes a decision — see `open-questions.md`
  → "The gold budget". Do not guess: whatever holds on reflect must hold here, or the two surfaces disagree.**
- **AI proposes, user reacts.** No blank state, no "Create new plan" as a primary action.
- **Not chat-first.** No persistent chat bar, no thread, no floating AI FAB, no sparkle button. Free-form input
  lives behind "Talk to the Chef."
- **The chef's voice at three levels:** plan summary, per-card rationale, change acknowledgment. Woven into the
  UI, never a separate conversation.
- **No celebration.** No confetti, no "Nice job!", no emojis in system copy. Calm completion.
- **Dynamically assembled, not templated** — Sunday and Wednesday must look meaningfully different.
- **Four-tab bottom glass nav** (Plan · Recipes · Groceries · You), Plan active.
- **No** calendar grids, date pickers, macro/nutrition charts (V3), pantry (V1.5), or cook mode (V1.5).
- **Motion honors `prefers-reduced-motion`.**

## Known defects folded into this pass (design inputs, not blind fixes)

| Bug | What | Where it lands |
|---|---|---|
| **BUG-006** | Expanded sheet shows the full recipe, not a summary + link out | State 12 / OPEN #4 |
| **BUG-008** | Meal card prints the cook time twice, sometimes disagreeing | OPEN #5 (meta row) |
| **BUG-009** | Null-title slot renders as a permanent "Thinking…" card | OPEN #6 |

`BUG-005` (app-wide serif fallback) is **1F**, not this pass — but if the generated designs assume a specific
typeface, say so explicitly so 1F can honor it.

## Verify at build (after the direction is chosen)

Rebuild in real shadcn/Tailwind + our glass layer — **never a paste of the generated `.dc.html`.** Then: the
existing Plan E2E specs (D1-D7, RG1-RG5, M1-M7, E1-E4, X1-X2) stay green with **no regression in the shipped
mechanics** → extend them for any new state → `/visual-qa` Layer A against the chosen direction (0 blockers /
0 high) → Layer B for content quality → ux-design-critic taste pass → Griffin's taste review.

## Build notes / design pointer

*(Filled in when Griffin hands back the chosen direction — design URL, projectId, what was built, which OPEN
questions resolved.)*

- **Claude Design URL:** —
- **projectId:** —
- **Re-fetch:** `DesignSync.get_file("<projectId>", "<name>.dc.html")`
