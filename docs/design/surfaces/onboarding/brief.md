# Onboarding interview (Phase 1E, feature #4) — design brief

> **A to-generate brief (Pass 2, 1 direction — a fast-follow).** Feed this to the meal-app Claude Design
> project to generate the **first-run onboarding interview**. This is the *on-ramp*; the destination (the You
> audit surface) is already designed + built. **Read `../../PROJECT-CONTEXT.md` first** (system + hard
> constraints), then **`../you/brief.md`** — this interview writes the very objects that screen displays, so it
> must inherit its vocabulary exactly. Loop + round-trip mechanics: `../../design-workflow.md`.

## What it is
The **first-run conversation.** On first login, before the user has ever seen a plan, the chef introduces
itself and asks a few quick things so week one isn't generic — then hands off *into* the first plan. It seeds
the same `user_preferences` + memory objects the **You** tab audits. It is **skippable** at any point.

It is NOT: a profile form, a settings wizard with a progress bar, or a ChatGPT-style chat thread. It is the
chef, talking, one question at a time, proposing tappable answers you react to.

## The one hard idea (the constraint that shapes everything)
Two of the app's hardest rules collide here, and the design must satisfy both:
- **"AI proposes, user reacts"** → rules out a blank profile form (a wall of fields to fill).
- **"Not chat-first"** → rules out a ChatGPT thread with a blank text box as the primary input.

**Resolution — reuse the interaction grammar the app already ships.** Each turn is a **chef line + tappable
proposal chips** (the answer is pre-proposed; the user *reacts* by tapping) **+ an "or tell me" free-text
escape** (the Talk-to-Chef pattern). This is exactly the Plan intent screen's grammar and the Talk-to-Chef
suggestion pills — so the interview introduces **zero new patterns**. "Conversational" comes from the chef's
voice and the react-to-a-proposal loop, not from a scrolling log of messages.

## The direction (single — this is a 1-direction pass)
**"The chef introduces itself."** A short, warm-but-direct, one-question-per-screen first-run. The chef opens,
asks ≤4 quick things (each a line + proposal chips + free-text escape + a quiet "skip this"), gives the
**allergy question its own turn with the You tab's red safety weight**, and closes by **reflecting back a
one-line narrative** ("So: cooking for two, pescatarian, weeknights under 45 — I'll remember this; change any
of it anytime in You") that is a **preview of the You narrative hero**, then hands off with **"Plan my first
week →"** straight into the existing Plan generation. Skippable throughout. No numeric progress bar, no confetti.

## The proposed question set (≤4 required + 1 optional closer)
A *starting* set — the design pass owns the exact count/combination (see OPEN). Each is one turn. The chips are
real proposals, not lorem; the free-text escape is always available.

1. **Who am I cooking for?** → `householdSize`. Chips: *Just me · Two of us · A family of 3 · 4 or more* (+ a
   stepper / "Other"). Doubles as the warm-up.
2. **How do you eat?** → `dietaryFramework`. Chips: *No restrictions · Pescatarian · Vegetarian · Vegan ·
   Keto · Mediterranean · Something else*.
3. **Anything I should never cook with?** → `restrictions` — **the safety turn.** Its own screen, carrying the
   You tab's red "I never cook with" weight. Chip prompts for common allergens + a free-text add; anything the
   user names as an allergy is marked (the `(allergy)` marker the You surface already renders). Easy to answer
   *"Nothing comes to mind"* and move on. No medical-intake tone.
4. **How much time on a weeknight?** → `maxCookTimeWeeknight`. Chips: *20 min · 30 min · 45 min · An hour+*.
   (Weekend ceiling defaults to 90 and is editable later in You — don't ask for it here.)
5. **(Optional closer) Any cuisines you lean toward — or anything else I should know?** → `cuisinePreferences`
   + a free-text note. Explicitly optional ("totally optional"). This is the turn that routes through the
   free-text capture path and can add a richer `onboarding` memory.

## What completing (or skipping) it produces — the backend contract (for build, not iteration)
The design doesn't change with these, but they keep the flow honest:
- **Tapped structured answers write `user_preferences` directly** — they're already typed, so **no model call
  per tap.** dietaryFramework, restrictions (allergy answers carry the `(allergy)` marker, mirroring You),
  householdSize, maxCookTimeWeeknight, cuisinePreferences.
- **Free-text turns route through the existing `user.talk` / `preferences-talk` capture path** (the same
  SAFETY-eval'd NL→ops machinery — 9/9 safety eval). The interview is a guided front-end over it *for the
  free-text turns only*.
- **Always writes ≥1 `sourceType:'onboarding'` memory**, synthesized from the answers even if the user only
  tapped chips (e.g. *"Cooking for 2 adults; keep weeknights under 45 minutes."* — this is the You brief's
  *"You told me when we started"* memory). **Build delta to flag:** `user.talk`'s `remember` op currently
  stamps `sourceType:"explicit"`; onboarding needs the write stamped `onboarding` (a param or a small dedicated
  seed step — not a schema change).
- **Sets an onboarding-complete flag** (small additive schema, e.g. `onboardingCompletedAt`). **Both complete
  AND skip set it** — the interview fires once and never nags. Re-running it is out of 1E scope.
- **The first generated plan reflects the answers** (the hand-off feeds the seeded prefs into Plan generation).

*Design target for the example run: the answers above produce **exactly** the You brief's populated state —
pescatarian, shellfish (allergy) + no pork, household 2, weeknight 45, cuisines Mediterranean/Thai/Mexican.
One closed loop between the on-ramp and the audit surface.*

## The hand-off seam — Plan has three front doors (Griffin, S34)
Designing the interview's exit means designing how the **Plan tab is entered.** Plan has three entry cases;
this interview is the third and newest, and it must not feel bolted on:
1. **Returning mid-week** — a confirmed/in-progress plan already exists (built, 1C).
2. **Fresh week** — no active plan; the intent screen (pills + textarea) is the entry (built, 1C).
3. **From onboarding** — this interview hands off **pre-seeded.** It should NOT dump the user on an empty,
   generic intent screen. The intent arrives *pre-filled* from what they just told the chef ("Here's what
   I'll cook around — anything to add before I plan your week?"), then flows into generation.
Design the seam so case 3 reads as *continuous* with the interview, not a hard cut to a stock Plan landing.
The seam is the deliverable here; **Plan's own full all-states visual buildout is a separate, later pass**
(a proposed interstitial phase before 1F — registered in the backlog, NOT this brief).

## States to design
1. **Intro card** — the chef introducing itself. Direct, brief: *"I'm your chef. A few quick things so week one
   isn't generic,"* not *"Welcome! Let's get to know you!"* The persistent **"Skip for now"** is reachable from here.
2. **A question turn** (the repeating unit) — chef line + proposal chips + "or tell me" free-text + a quiet
   "skip this / not sure yet." Show how one turn advances to the next.
3. **The safety turn** — the allergy screen carrying extra weight (the You red-card treatment), still easy to
   pass with "Nothing comes to mind." How does it signal *this one matters* without feeling like a medical form?
4. **The optional closer** — cuisines + "anything else," visibly optional; the free-text/memory turn.
5. **Skip-all state** — what tapping "Skip for now" does: an honest chef line (*"No problem. I'll start with
   something safe and simple and learn as we cook."*) → straight into the first plan. Not guilt-tripping.
6. **Closing hand-off card** — the one-line narrative reflect-back (a preview of the You narrative hero) +
   *"Plan my first week →"*. The payoff, not a dead-end confirmation.
7. **The seam into the first plan** — the transition should feel seamless into Plan's existing generate state
   (reuse it; just show the hand-off doesn't jar).

## OPEN — iterate here
- **Layout of the turns: one-question-per-screen (takeover, advance)** *vs* **a stacked, accreting
  "conversation"** that keeps answered turns visible above. This is the single biggest call. Per-screen matches
  the Plan intent grammar and stays clearly not-a-chat-thread; the stacked read feels more conversational and
  shows progress for free but risks drifting toward the forbidden chat log. **Recommendation: per-screen** —
  generate it, but the pass can test the stacked read.
- **Exact question count + combinations.** Is 4 right? Combine *who* + *how you eat* into one turn? Drop the
  optional closer? Target: **≤4 required exchanges + skip** before it reads as a form (scope OQ#1).
- **Progress cue.** None (rely on brevity + chef pacing: *"two more things and I'll get cooking"*) vs subtle
  dots. A numeric "1 of 4" stepper reads as the form we're avoiding — lean against it.
- **How the safety turn earns its extra weight** without a clinical/medical-form tone.
- **How free-text coexists with chips per turn** — an always-visible field, or an "or tell me" reveal? (Reuse
  the Plan intent screen's resolution.)
- **The closing reflect-back** — how much to echo the You narrative hero (teaches where to correct) vs staying
  lightweight so the hand-off feels fast.
- **Skip affordance placement + tone** — present and reachable at every step, but not the obvious default path.
- **The onboarding→Plan seam** — does the hand-off land on a *pre-seeded, editable* intent screen (one last
  look before generating) or go straight into streaming the first plan? Lean pre-seeded; test both.

## Griffin's S35 considerations (raw inputs to weigh in the pass — not decisions)
Captured from a 2026-07-24 brain dump. Design *considerations* for the pass to resolve, not settled rules — several may become OPEN items or defer to the separate chef-tour feature.
- **The gate debate (don't wall the app behind onboarding).** Griffin's anti-pattern: Cooklist/Mealtime gate you out of the app until you finish a long setup (incl. pantry) — frustrating; he wants to *see what he's got* before committing. Our interview is already skippable, which answers most of this — but the pass should make the **skip-to-see-the-app path feel first-class**, and weigh how much value-prop to sell up front vs. letting intrigue + a fast payoff pull the user in. Tension: a hard gate lifts completion but costs new users; an open door lowers completion but respects "AI proposes."
- **Where the value-prop pitch lives.** Griffin wants a moment that *sells the agentic value* ("here's what this does for you"), not just data capture. Options: fold a light value line into the intro card, a one-card pitch before the first question, or push the real selling into the separate **dynamic chef tour** (idea-backlog, S35) and keep this interview lean. Lean: keep the interview about *learning you*; let the tour do the *teaching/selling*.
- **"You can always just talk to me" belief.** A sentiment Griffin wants seeded early: dictating/talking is the easy path and the chef interprets intent. The free-text "or tell me" escape already models this — consider whether the intro or closer names it explicitly ("easiest thing: just tell me, in your words").
- **Interview vs. tour are different features** (idea-backlog, S35). This brief stays the *interview* (learn the user). The tab-by-tab walkthrough + demo states + "here's how the app works" is the **chef tour**, tracked separately and likely post-MVP — do not absorb it here.

## SETTLED — don't touch (drift here = noise to correct, not a decision)
- Every token, glass surface, type scale, register, and hard constraint in `PROJECT-CONTEXT.md` (dark-only,
  `#0E0E10` bg, accent `#3A86FF` used sparingly, glass surfaces, eyebrow all-caps labels, lucide icons, 430px
  phone). No new palette, no light mode, no cartoon graphics, no all-caps outside the eyebrow.
- **Not chat-first.** No persistent chat bar, no free-typing thread as the primary mode, no AI FAB / sparkle
  button. Chips/proposals are primary; free-text is the escape, in the Talk-to-Chef vocabulary.
- **AI proposes, user reacts.** No blank forms, no "fill out your profile," no "Create your account" data-entry
  feel. Every turn arrives with a proposed answer to tap.
- **Register:** chef's voice — direct, opinionated, brief. No cheerleading, no confetti, no celebration, **no
  emojis, ever.** No em dashes as default punctuation. *"A few quick things so week one isn't generic,"* not
  *"Tell us about yourself!"*
- **Inherit the You audit vocabulary exactly.** The same red safety weight for never-cook-with, the same
  soft-constraint language, the same memory provenance (*"You told me when we started"* = the onboarding
  label). The interview writes the very objects the You tab displays — they must speak the same language.
- **Skippable is non-negotiable and always reachable.** Skipping is a first-class path to sensible defaults, not
  a trap.
- **It hands off INTO the first plan.** The interview is an on-ramp, never a terminal confirmation screen.

## Verify at build (not part of this brief, for reference)
Extend the E2E harness for the two onboarding paths (**complete** + **skip**) — feature #7 lands these, closing
the You E2E gap → `/visual-qa` against the generated direction → ux-design-critic taste pass → Griffin's taste
review. Real-model check: a completed interview's synthesized/free-text memory is safe + faithful (reuse the
`preferences-talk` safety eval). Build in real shadcn/Tailwind + our glass layer — **never a paste of the
generated `.dc.html`.** When #4 ships + its E2E lands, **1E closes → M5 done.**

## Design pointer — TO IMPORT (Pass 2)
- *(Filled in after Griffin runs the pass.)* Chosen direction: — · Claude Design URL: — · projectId: — · file: —
- Re-fetch: `DesignSync.get_file("<projectId>", "<file>.dc.html")`.
