# Meal App — context for Claude Design

*The "read me first" for any design work in the meal-app Claude Design project. The distilled
product: enough to design correctly without reading the whole repo. Kept in sync from
`docs/design/` on each design pass. (Pattern adopted from FFOS, 2026-07-19.)*

---

## What meal-app is

An AI-powered meal management app, **web app in phone form factor** (430px max-width, full-width
on mobile, bottom tab nav; iOS later). The user opens it, an AI "personal chef" proposes a
personalized week of dinners, the user reacts/tweaks/confirms, and a grocery list falls out.
Productized freemium product (not a private one-off). V1 users: Griffin + wife.

## North star

**"I have no idea what to cook" → "my grocery list is ready" in under 10 minutes.** Every screen
should ladder to that weekly ritual. The bet the whole product rides on: *the AI generates the UI*
— the system has already done the work; the user is here to react, not to fill forms.

## Who uses it

A solo health-conscious adult (Griffin's profile). Phone, real kitchen moments (Sunday planning,
Wednesday "what's tonight"). Wants a competent chef, not a chatbot or a form.

## Hard constraints that shape the UI (design *with* these, not around them)

1. **AI proposes, user reacts.** Never a blank state or a "Create new" button as the primary
   action. Every landing screen is pre-populated with an AI proposal.
2. **Not chat-first.** No ChatGPT-style thread, no persistent chat bar, no floating AI FAB, no
   sparkle button. The AI shows up *through the content*: rationale lines, contextual chips,
   generated cards. Free-form input lives behind "Talk to the Chef," not a permanent field.
3. **Dark mode only.** No light-mode variants in V1.
4. **The chef's voice runs through the output** at three levels: plan summary (header), per-card
   rationale (the "why this, this day" line, accent-colored with a faint →), and change
   acknowledgment. Brief, opinionated, woven into UI — never a separate conversation.
5. **Dynamically assembled, not templated.** A Sunday-morning plan view and a Wednesday-evening
   view should look *meaningfully different*, not just carry different data.

## Information architecture (design against what's SHIPPED)

Four tabs, four nouns, bottom glass tab bar: **Plan · Recipes · Groceries · You**.
- **Plan** (shipped, Phase 1C ✅) — landing screen, AI weekly plan, "Talk to the Chef" surface.
- **Recipes** (shipped, Phase 1B) — cookbook, AI search/generation/import. Cook mode = later overlay.
- **Groceries** (Phase 1D, NEXT — first Claude Design surface) — auto-synced shopping list.
- **You** (Phase 1E, NEXT — Claude Design surface) — the **trust surface**: an audit of what the chef
  knows about you (hard constraints + a correctable memory ledger), NOT a settings form. Preferences are
  captured by AI (onboarding interview / Talk-to-Chef / thumbs); this screen verifies + corrects. (OQ#2
  resolved S32: AI-first capture, structured audit — split by data type. See `surfaces/you/brief.md`.)

## Register / voice (how copy reads)

- **Chef's voice: direct and opinionated.** "Here's your week," not "Would you like me to suggest…"
- **No sycophancy, no cheerleading.** No "Great choice!", no "You did it!", no confetti/celebration.
- **Brief.** One line where one line works. **No emojis in system UI copy, ever.**
- **Confident, not chirpy.** "Updated." not "All done! ✨". No em dashes as default punctuation.

## The design system — the honest truth (this is where meal-app DIFFERS from FFOS)

Unlike FFOS (near-stock shadcn), **meal-app HAS a bespoke visual language worth protecting** —
dark liquid-glass, Crouton/Flighty-inspired. It is NOT stock shadcn. **Reuse it exactly; do not
invent a new palette, radius, or component style.** But note: the *deliberate* design-system
consolidation (refined type scale, spacing, motion, component library) is still the **1F pass**
(decision 2026-07-09). So today's system is a real-but-unpolished vocabulary — protect it, don't
freeze it. If a generated direction introduces new brand colors, a light mode, cartoon graphics,
or all-caps headers (outside the eyebrow), that's **drift to correct, not a decision**.

## ⚠️ THE PALETTE CHANGED. Read this before generating anything.

**Design Specification v1.0 — "Gold voice, cream hand" (`system/design-spec.dc.html`, theme 11i) is
canonical as of S39 (2026-07-26). Where an earlier screen or an earlier version of this file disagrees
with it, IT WINS.** `Guidelines.md` is the *superseded* aesthetic canon — read it for the anti-pattern
list only, and ignore its colour values entirely.

**The app is mid-migration, and you must design against the END state, not the current screens.**
Onboarding was migrated in S39 and is the **worked example — match it**. Plan, Recipes, Groceries and
You are still on the retired palette until phase 1E.7 sweeps them. So: **do not sample colours from a
screenshot of Plan/Recipes/Groceries/You. They are the "before".**

**Token pin — the SPEC values (`--spec-*` in `src/app/globals.css`):**
- **Floor `#0F0B08`** — warm near-black. NOT `#0E0E10`, which was the cool floor this replaced.
- **Presence — gold `#E9B348`** (tint `#F0C265`, voice `#E0B463`). **The chef, and only the chef:** the
  orb, the presence dot, the active tab, the chef's italic rationale, the `YOUR CHEF` eyebrow.
- **Action — cream `#F4EBDC`** (label on it always `#1A140C`; soft variant `.1` fill / `.32` line).
  **Anything the finger is meant to find.** Gold and cream never appear in the same control and their
  roles are never swapped. **The old indigo `#3A86FF` accent is RETIRED — do not use it.**
- **Type, five warm steps, never invent a sixth:** primary `#F7F2EA` · feature `#F0EBE4` (hero sentences
  and pull quotes only) · body `#CAC4BC` · muted `#A29484` · caption `#8A7C6C`.
- **Semantics, max one per viewport:** destructive `#D96A5B` (text `#E39B92`) · success `#9CB86F`.
  There is deliberately **no caution hue** — amber is the chef, so a yellow badge would make the chef
  look like an alert.
- **Radii: the eight-rung scale** — 7 / 9 / 12 / 14 / 16 / 18 / 22 / 46. Nothing off-scale.

**The six laws (full text in the spec's §00 — these are hard rules, not preferences):**
1. Light enters **once, from above, and is always gold**. One wash per screen, under the content layer,
   never animated. No cream wash, no second hue, no bottom-up light.
2. **Gold is who the app is. Cream is what you press.**
3. **Nothing you read twice is accent-coloured.** Titles, body, metadata, labels are cream-white through
   warm grey, always. The only coloured type in the product is the chef's *italic* rationale and the
   `YOUR CHEF` byline.
4. **No cool white. Ever.** Every neutral — every border, scrim and low-alpha fill — is warm.
   `rgba(255,255,255,x)` reads blue on this floor; substitute `rgba(240,222,190,x)` at the same alpha.
5. **A label is type. A control is a surface.** Nothing decorative wears a pill. If it has a fill and a
   border it must respond to a tap; if it only names something it is flat uppercase type, no container.
6. **Count the accents: at most three gold marks in the content layer, exactly one filled cream button,
   at most one semantic hue.** The active tab sits outside the count.

**The elevation ladder (spec §04) — a surface may only ever sit ONE step above its parent:**
- **L0 Floor** `#0F0B08` · **L1 Glass card** `rgba(70,58,46,.4)`, blur 32, saturate **115** (low on
  purpose — higher picks up a blue cast), border `rgba(240,222,190,.11)`
- **L2 Inset row** `rgba(240,222,190,.045)`, border `.08`, no blur of its own (borrows the parent's)
- **L3 Control** `rgba(84,70,56,.46)`, border `rgba(240,222,190,.16)` — inputs, steppers, segmented pills
- **L4 Chrome** `rgba(22,16,11,.72)`, blur 24, saturate 180 — tab bar, nav, bottom sheets
- **L5 Floating** `rgba(22,16,11,.94)`, blur 40, shadow `0 12px 32px -8px rgba(0,0,0,.7)` — **the only
  level that casts a shadow.** Toasts, menus, popovers.

**Lighting — three named recipes, chosen by what the screen is FOR (spec §03):**
- `light.ambient` (default, every list/content screen incl. **Plan**): `radial-gradient(560px 420px at
  78% -12%, rgba(233,179,72,.13), transparent 62%)`
- `light.hero` (only where the orb is — onboarding, reflect): adds a faint floor bounce; the only recipe
  permitted two stops
- `light.flat` (dense/task screens — the grocery list): half strength, same origin

**The chef orb** is specified in full in spec §02 (ember, not a chat avatar; hairline toque; four sizes
88 / 40 / 34 / 20 and no others; ring + steam only at 64px+). **One orb per screen, never two. The orb is
not a button.**

**Type scale (from shipped components):** hero 26/bold · section 20/bold · card title 17/semibold ·
chef rationale 13 *italic* in gold-voice with trailing → · body 14 · meta 12 muted · **eyebrow 11
medium tracking-widest muted ALL-CAPS** (the one sanctioned all-caps use — day/section labels).
A refined type scale, motion, and component-library consolidation are still the **1F** pass.

**Motion:** `.shimmer-bar` (AI-working) and `.animate-highlight-ring` (one-shot on change-landed).
**Icons:** lucide-react. Anti-pattern list: `Guidelines.md` (colour values there are superseded).

Visual reference for all of the above: **`system/design-spec.dc.html`** — that file, and only that file.
The other `system/*.html` cards (`colors`, `type`, `chips-pills`, `buttons-inputs`, `meal-card`, `sheets`,
`surfaces`) are a **pre-spec snapshot on the retired palette** and each now carries a superseded banner.
Do not sample colour from them.

## What "OPEN vs SETTLED" means in a brief

Every per-surface brief names two lists so we don't burn iteration on settled things:
- **OPEN — iterate here:** the genuinely undecided layout/interaction questions for this surface.
- **SETTLED — don't touch:** the tokens, glass surfaces, type scale, register, and hard
  constraints above. If a direction drifts these, it's noise to correct, not a decision.
