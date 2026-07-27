# Onboarding interview (Phase 1E, feature #4) — design brief

> **LOCKED (S35, 2026-07-24).** Direction **1D "Talk it through"** is chosen and the build target. This file is now
> the build spec, not a to-generate brief. History of how we got here is in the changelog. Read
> `../../PROJECT-CONTEXT.md` (system) + `../you/brief.md` (the audit surface this interview seeds) before building.

## Design pointer — LOCKED (Pass 2, 1D)
- **Chosen direction:** **1D — "Talk it through"** (the merge of 1C's ambient/alive feel with a real interview; the
  ember/steam chef presence replaces 1C's cold orb). 1A/1B/1C were explorations, retired; 1A's app-explanation
  clarity was folded into 1D's intro.
- **Claude Design URL:** `https://claude.ai/design/p/8bc73bfa-9683-4b44-ab06-40da9ec78590?file=Onboarding+Interview.dc.html`
- **projectId:** `8bc73bfa-9683-4b44-ab06-40da9ec78590` · **file:** `Onboarding Interview.dc.html`
- **Re-fetch (durable):** `DesignSync.get_file("8bc73bfa-9683-4b44-ab06-40da9ec78590", "Onboarding Interview.dc.html")`.
  No local snapshot saved — the live design is re-fetchable and drifts as Griffin iterates (same policy as You).
- Build in real shadcn/Tailwind + our glass layer — **never a paste of the generated `.dc.html`.**

## What it is
The **first-run conversation.** On first login, before the user has seen a plan, the chef introduces itself + what
the app does, asks a short set of questions (tap or type), reacts like an opinionated cook, then hands off into a
**pre-seeded** plan setup. It seeds the same `user_preferences` + memory objects the **You** tab audits. **Skippable
at every step** (skip-to-app is first-class — the anti-Cooklist "let me see what I've got" call, open-questions S35).

## The interaction model (the thing that makes it work — one model on every screen)
Every question screen runs **one** layout, no modes:
- **Tappable answers on top** — the primary path. Cards for categorical (time), chips for multi-select (diet),
  steppers for counts (household). Tapping is always a complete path start to finish.
- **A mic/text field at the bottom** — a quiet "or just tell me." **R1: this is a TEXT input** (type your answer;
  it routes through the existing `user.talk` free-text capture path). The **mic icon stays for the feel but is not
  wired** — tapping it fires a "Voice coming soon" toast (Griffin, S35). Real dictation/STT is deferred (out of R1;
  open-questions "Dictation implementation approach", S35).
- **"What I caught" tray** — appears only while typing/talking, and shows **only what the free-text surfaced that
  the pills don't already cover** (say "pescatarian, no cilantro, love Thai" → the Pescatarian pill lights up and
  only *cilantro + Thai* land in the tray). No redundancy between examples and cards.

This satisfies both hard rules at once: **AI proposes / user reacts** (tappable proposals) and **not chat-first**
(no thread, no persistent chat bar — the text field is a per-question "or tell me," the Talk-to-Chef pattern).

## The question set — 4-question core, then an adaptive deep round
**Core (all 4 required — these are load-bearing for a safe, good *first* plan):**
1. **Who am I cooking for?** → household **composition** (see schema note below), not just a count. Adults /
   Children (ages 2–12) / Babies under 2 (first foods) steppers; a babies count surfaces the "I'll flag first-foods
   textures and skip choking hazards" note. (Griffin's 9-month-old-vs-toddler point.)
2. **How do you eat?** → `dietaryFramework` (chips: No restrictions / Pescatarian / Vegetarian / Vegan / Keto /
   Mediterranean / Something else).
3. **Anything I should never cook with?** → `restrictions` — **the safety turn**, its own screen, the You tab's red
   "the one I have to get right" weight; allergy answers carry the `(allergy)` marker. Easy to pass ("Nothing comes
   to mind"). No medical-intake tone.
4. **How much time on a weeknight?** → `maxCookTimeWeeknight` (cards: 20 / 30 / 45 min / An hour+). **Core, not
   optional** (Griffin, S35 — a week of 90-min recipes for a 30-min cook is a bad first impression). Weekend ceiling
   defaults to 90, editable later in You.

**Adaptive deep round (optional, opt-in after the core):** the "that's the essentials — a few more minutes and I'll
really cook to your taste" offer, then a value-meter ("the more you tell me, the better your plans get / Optional")
and questions the chef **picks adaptively** (heat/spice, proteins to feature, effort/sophistication, specific
protocols/diets), each with an honest "why we ask" line. **Always-present one-tap "I'm good for now, build my
week."** The round **reacts to what's been said, skips what it already learned, and stops when it has enough.**

## Deep-round stopping policy — a real build task (Griffin, S35)
"Keep probing as far as someone will go, but don't exhaust them." Needs a **planner + stopping threshold**:
what-to-ask-next over the deep-question bank, and a "learned enough" cutoff (a hard question cap AND a
diminishing-signal check). **We will tune this** — treat it as its own task with an eval, not a fixed constant.

## What it writes — the backend contract
- **Tapped answers write `user_preferences` directly** (already typed — no model call per tap): dietaryFramework,
  restrictions (with `(allergy)` marker), weeknight time, cuisines; household writes the composition field.
- **Typed free-text routes through `user.talk` / `preferences-talk`** (the SAFETY-eval'd NL→ops path, 9/9). The
  mic-as-text field is a guided front-end over it.
- **Always writes ≥1 `sourceType:'onboarding'` memory**, synthesized from the answers even if the user only tapped
  (the You brief's "You told me when we started" memory). **Build delta:** `user.talk`'s `remember` op stamps
  `sourceType:"explicit"`; onboarding needs it stamped `onboarding` (a param / small seed step — not a schema change).
- **Onboarding-complete flag** (small additive schema, e.g. `onboardingCompletedAt`). **Both complete AND skip set
  it** — fires once, never nags. Re-running is out of 1E scope.
- **The first generated plan reflects the answers** (the hand-off feeds the seeded prefs into Plan generation).

### ⚠ Household composition schema — build dependency (needs a quick `/architect` pass before the household turn)
`user_preferences.householdSize` is a single int today; the design captures per-member nuance. **Recommendation for
R1:** add a flexible Zod-validated **composition** field (adults / children[ageYears] / babies[ageMonths]); keep
`householdSize` as the derived total for portion math; render the composition into `getChefContext` as a sentence
(age-appropriate prep/textures, choking-hazard avoidance, portioning). **Defer** full per-member *preference*
profiles + conflict navigation ("member A is dairy-free") to the **V1.5 Family Member Profiles / sharing** feature —
solo R1 has one cook; ages drive prep, not managed per-person taste sets. Three consumers touch this shape
(interview capture, getChefContext, planning), and it overlaps the 1E.5 dynamism thread — so design the shape once.
Ratification pending in open-questions (S35).

## States to build
1. **Intro** — ember chef presence + "I learn how you eat, then build a plan around it, not a template," the three
   app-explainer points (propose/react · plain words · remembered + editable in You), "Let's get started" + a
   first-class "Skip for now, use sensible defaults." (Value-prop lives here; the full app *tour* is a separate
   post-MVP feature, not this flow — open-questions S35.)
2. **A core question turn** (the repeating unit) — tap answers on top, mic-as-text at bottom, "what I caught" tray,
   confirm CTA, "skip this question."
3. **The safety turn** — allergy screen, red weight, easy pass.
4. **Deepen offer + adaptive deep turns** — value-meter, "why we ask," always-present "I'm good for now."
5. **Skip-all** — honest chef line ("I'll start with something safe and simple and learn as we cook") → straight to
   plan. Not guilt-tripping.
6. **Reflect** — "here's what I'm thinking," an **opinionated cook** hook ("I'm already picturing blistered
   shishitos and a chili-crisp salmon") + summary + the red "I'll never cook with" recap + "change anything in You"
   → "Plan my first week."
7. **Pre-seeded plan setup (the hand-off)** — "your plan, pre-filled from what you told me": seed chips + dinners
   stepper + lunch/breakfast toggles + an "or tell me what this week looks like" free-form escape → "Build my first
   week." **This IS the existing Plan intent modal, pre-filled — not a bespoke onboarding screen** (door #3 of the
   three front doors; one architecture). Then Generating (reuse Plan's stream state).

## SETTLED — don't touch (drift = noise to correct, not a decision)
- All PROJECT-CONTEXT tokens/glass/type/register, dark-only, 430px, lucide, eyebrow all-caps only. **Palette is a 1F
  decision** — the amber-plus-blue that emerged here (amber = chef presence/warmth, blue = actions) is *provisional*
  and gets locked in the 1F design-system pass, not here (open-questions S35).
- **Not chat-first.** No persistent chat bar/thread/FAB. The text field is a per-question "or tell me."
- **AI proposes / user reacts.** No blank profile form. Every turn arrives with tappable proposals.
- **Register:** chef's voice, direct, warm, brief. No emojis, no cheerleading/confetti, no em dashes.
- **Inherit the You audit vocabulary exactly** — red safety weight, memory provenance ("You told me when we
  started" = the onboarding label). The interview writes the objects the You tab displays.
- **Skippable + skip-to-app first-class.** **Motion = "chef is present" language, honors `prefers-reduced-motion`.**
- **Hands off INTO the plan** — never a dead-end confirmation.

## OPEN / dependencies (resolve at build, not in more design iteration)
- **Household composition schema shape** — the `/architect` pass above (ratify in open-questions).
- **Deep-round stopping policy** — the planner + threshold task above (needs an eval).
- **Palette** — deferred to 1F; a color exploration can run now in Claude Design to keep 1E.5 compatible.

## Verify at build
E2E the two paths (**complete** + **skip**) → `/visual-qa` against the locked design → ux-design-critic taste pass →
Griffin's taste review. Real-model check: a completed interview's synthesized/free-text memory is safe + faithful
(reuse the `preferences-talk` safety eval). When #4 ships + its E2E lands, **1E closes → M5 done.**
