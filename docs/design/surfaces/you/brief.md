# You tab (Phase 1E) — design brief

> **UPDATE (S32): Pass 1 is DONE — design imported, Direction A chosen.** See "Design pointer / As-built / Gaps"
> below for the record of what was built. The generate-brief content that follows is retained as the record of what
> was asked.
>
> **(Original) A to-generate brief.** Feed this to the meal-app Claude Design project to generate directions
> for the **You-tab steady-state audit surface** (Pass 1). Loop + round-trip mechanics:
> `../../design-workflow.md`. Read `../../PROJECT-CONTEXT.md` first (system + hard constraints).

## Design pointer — IMPORTED (Pass 1, S32)
- **Chosen direction:** **A — the chef's narrative read** (over the control-panel B). Griffin ran the pass and picked A.
- **Claude Design URL:** `https://claude.ai/design/p/8bc73bfa-9683-4b44-ab06-40da9ec78590?file=You.dc.html`
- **projectId:** `8bc73bfa-9683-4b44-ab06-40da9ec78590` · **file:** `You.dc.html`
- **Re-fetch anytime (durable reference):** `DesignSync.get_file("8bc73bfa-9683-4b44-ab06-40da9ec78590", "You.dc.html")`.
  No local `imported.dc.html` snapshot saved this pass — the live design is re-fetchable and drifts as Griffin iterates.

## As-built (what Direction A actually is — build the LAYOUT, not the demo numbers)
- **Narrative hero** — a prose card in the chef's voice ("I'm cooking for two, all pescatarian since July, keeping
  weeknights under 45 minutes…") + "All of this is editable. The fastest way to fix it is to just tell me." + a
  primary **Talk to the chef** button. The AI-first capture path is the hero — exactly as OQ#2 resolved.
- **Hard constraints, two weight tiers:** a red **"I never cook with"** safety card (SAFETY-CRITICAL badge; allergy
  chips carry an "allergy" sub-label; add/remove) above a calmer soft card ("You're not a fan of" dislikes / "You
  lean toward" cuisines / "Cooking for" + "Time I'll take"). Safety weighting is built in.
- **Memory ledger** ("WHAT I'VE PICKED UP") — cards with a provenance row (icon + "You told me when we started" /
  "You told me" / "I noticed"), per-item edit + remove (×), an "N more the chef remembers" expand, honest microcopy.
- **Talk-to-Chef sheet** — suggestion pills ("I'm not pescatarian anymore" / "I'm allergic to gluten" / "Actually I
  do like cream" / "Add Japanese and Korean") + text input + mic + send. Remove → toast "Removed. Your chef will
  stop cooking around this." Capture → toast "Got it. I've updated your constraints and noted the rest."
- **Account footer** — name, email, household, sign out.
- **Two states:** returning-user (full audit) + new-user ("We've just met" / "STILL LEARNING" empty ledger). Both are
  the *audit* surface — the new-user state is NOT the onboarding interview.

## Gaps found on inspection (fold into the build)
- **Memory *edit* routes through Talk-to-Chef, not inline** — tapping edit pings "tell your chef what changed." A
  legit call (matches AI-first) that *simplifies* the backend: v1 can ship **remove (`memory.deactivate`) + re-tell**
  and likely drop `memory.edit`. Confirm with Griffin at build.
- **Capture toast has no undo** — the brief (feature #5) wants undo on the capture confirmation. Add it (cheap).
- **Ledger microcopy over-promises** — "As I learn more I fold older notes together" implies memory dedup/merge,
  which is explicitly OUT of 1E scope. Soften the copy for v1 (pulling real dedup in is scope-creep).
- **Onboarding interview (#4) is NOT here** — this file is the audit surface only. #4 needs its Pass-2 design (1
  direction, inheriting this vocabulary) before it builds. The new-user state here ≠ the conversational interview.

## What it is
The **You** tab — the fourth tab, and the product's **trust surface**. It answers one question:
*"What does my chef know about me, and is any of it wrong?"* A confirmed plan and a grocery list
are the weekly payoff; **You** is why week 12 beats week 1. It is NOT a settings screen — it's an
audit surface with real correction controls. A user comes here to verify and fix, not to fill forms.

## The one hard idea (the OQ#2 tension, made visual)
Preferences are **captured by AI** (an onboarding interview, "Talk to the Chef," thumbs on meals) —
never entered on a form. So this screen's job is **trust and control**, not data entry. The genuinely
open design question, and what the two directions should contrast:

> How do you render "what your chef knows about you" so it feels like a chef who *gets* you and
> whom you can *correct* — not a database dump, and not a settings panel?

Two poles worth generating and comparing:
- **Direction A — the chef's read of you (narrative/profile).** Leads with the chef's understanding
  in its own voice ("Cooking for 2, pescatarian since July, easy on cream sauces"), memories as
  correctable cards. Warmer; risk = feels vague or un-scannable.
- **Direction B — the control panel (structured).** Grouped hard-constraint controls up top + a memory
  ledger below. Scannable, trustworthy; risk = drifts toward the settings form we're trying not to be.

The winner is likely a considered blend — generate both poles so we can see the trade honestly.

## States to design (Pass 1)
1. **The audit surface (populated, the main state)** — the real returning-user view. Two things coexist:
   - **Hard constraints** (typed, directly editable): dietary framework, **restrictions/allergies**
     (safety-critical — must be legible and one-tap correctable), dislikes / "no list," household size,
     weeknight + weekend cook-time ceilings, cuisine leanings.
   - **Memory ledger** (soft, free-form): what the chef remembers, each item labeled by **how it was
     learned** ("You told me when we started" / "You told me" / "I noticed"), each removable and editable.
2. **Account/household footer** — display name, email, household name, sign out. Quiet, bottom of screen.
3. **Sparse state (new-ish user)** — a few onboarding facts, little implicit memory yet. Show it doesn't
   look broken when the ledger is short — the chef is honest that it's still learning.
4. **Edit affordances** — how a restriction chip is added/removed; how a memory is removed (with the
   "chef stops acting on this" reassurance) and edited. Inline, in our sheet/chip vocabulary.

## Real data to populate it (use these shapes, not lorem)
Hard constraints (from `user_preferences`): dietary = **pescatarian**; restrictions = **["shellfish
(allergy)", "no pork"]**; dislikes = **["cilantro", "blue cheese"]**; household size = **2**; weeknight
ceiling = **45 min**, weekend = **90 min**; cuisines = **["Mediterranean", "Thai", "Mexican"]**.

Memory ledger (from `ai_memories`, with source label):
- "Cooking for 2 adults; keep weeknights under 45 minutes." — *You told me when we started*
- "Switched to pescatarian in July." — *You told me*
- "Eases off heavy cream sauces." — *I noticed* (from thumbs)
- "Does Taco Tuesday most weeks." — *I noticed*
- "Prefers Rao's for jarred tomato sauce." — *You told me*

## OPEN — iterate here
- The narrative-vs-control-panel balance (the two directions above).
- How **"how I learned this"** provenance reads on each memory without clutter (label? icon? grouping?).
- How **removing/editing a memory** feels reassuring, not destructive ("the chef will stop acting on this").
- How **safety-critical restrictions/allergies** are visually distinguished from soft dislikes (they carry
  more weight; a wrong one is a real harm).
- The **sparse state** — honest "still learning" without feeling empty/broken.

## SETTLED — don't touch (drift here = noise to correct, not a decision)
- Every token, glass surface, type scale, register, and hard constraint in `PROJECT-CONTEXT.md`
  (dark-only, `#0E0E10` bg, accent `#3A86FF` used sparingly, glass surfaces, eyebrow all-caps labels,
  bottom glass tab bar, lucide icons, 430px phone). No new palette, no light mode, no cartoon graphics.
- **This is an audit surface, not a settings form** (OQ#2 resolved, S32). Do not lead with a "Save"-heavy
  form. Capture happens elsewhere (interview / Talk-to-Chef); this screen verifies and corrects.
- **Register:** chef's voice, direct, no cheerleading, no emojis, no confetti. "Here's what I know about
  you," not "Tell us about yourself!" Brief.
- No AI FAB / sparkle button / persistent chat bar (the AI shows up through content, per the app).

## Pass 2 preview (fast-follow, not this brief) — the onboarding interview
A separate 1-direction pass will design the **first-run conversational interview** that seeds all of the
above. It should **inherit this surface's memory vocabulary** — design the destination (this audit
surface) first, then the on-ramp. Flagged here so directions here stay compatible with a conversational
capture flow (the interview writes the very objects this screen displays).

## Verify at build (not part of this brief, for reference)
Extend the E2E harness for You flows → `/visual-qa` against the imported direction → ux-design-critic
taste pass → Griffin's taste review. Build in real shadcn/Tailwind + our glass layer — **never a paste of
the generated `.dc.html`.**
