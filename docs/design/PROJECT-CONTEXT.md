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
invent a new palette, radius, or component style.** ⚠️ **And as of 2026-08-01 (S58) the design-system
pass is DONE** — 1F Workstream B closed at 9 of 9, covering the type scale, motion, the component
library and the caps rungs. This file used to say that consolidation was "still the 1F pass" and that
the system was "real-but-unpolished"; **both sentences are now false.** The vocabulary is settled and
named, so a generated direction should INHERIT it rather than improve on it. If a direction introduces
new brand colors, a light mode, cartoon graphics, or all-caps headers (outside the two caps rungs),
that's **drift to correct, not a decision**.

## ⚠️ THE PALETTE CHANGED. Read this before generating anything.

**Design Specification v1.0 — "Gold voice, cream hand" (`system/design-spec.dc.html`, theme 11i) is
canonical as of S39 (2026-07-26). Where an earlier screen or an earlier version of this file disagrees
with it, IT WINS.** `Guidelines.md` is the *superseded* aesthetic canon — read it for the anti-pattern
list only, and ignore its colour values entirely.

**As of 2026-07-27 (S42, phase 1E.7) the mechanical migration is DONE and the whole app is on the spec
palette.** Every surface — Plan, Recipes, Groceries, You, Onboarding, the shell and the shadcn
primitives — runs on the `--spec-*` tokens: every cool-white alpha is warm, every radius is on the
eight-rung scale, each screen carries one of the three named wash recipes, and the pre-spec `:root`
family is now an alias layer over the spec tokens with no independent colour values of its own. The
retired indigo `#3A86FF` is gone from the build entirely, including `--primary`, which is now cream.
**Screenshots of any surface are safe to sample from again.**

**✅ Spec §12 items 04, 05 and 07 CLOSED (S54).** The Recipes nav carries square top corners over a single
bottom bar; every icon-only control clears 44px, fixed at the primitive (`ui/button.tsx` shipped icon
variants at 24/28/32/36px, so *every* rung was under the floor); and `.spec-group-title` / `.spec-row-title`
exist as real H4/H5 rungs, with 9 subsection headings promoted from `<p>` to `<h2>`. **Sample screenshots of
these freely — they are the shipped system now, not a known gap.**

**✅ Spec §05 CLOSED (S57 + S58, B8a + B8b) — the type ladder is named end to end.** Six of the ten rungs
had **no class at all**, which is why the build carried 30 distinct type sizes and 192 of 255 sites sat off
the ladder. All ten exist now, in `@layer components` so a call site can still choose colour; 169 sites were
routed and adoption is 218 rung call sites against 71 hand-typed raw sizes. The full list is under
"Type scale" below — **use those class names, never a raw `text-[Npx]`.**

**⚠️ Nothing is deliberately un-migrated any more.** This block used to list three survivors — the amber
quick-add dedupe notice (`BUG-045`), the un-named caps rungs, and the constraint chip's 20×20 remove `×`
(`BUG-048`). **All three closed in S57 and their allow-lists were deleted rather than emptied.** Do not
treat any of them as a known gap; if a generated direction reproduces one, that is drift.

*(Why this paragraph exists at all: a stale exemption is a licence to ignore a real defect and it outlives
the reason for it. S42 caught it in the rubric's palette check, S52 in B1/B5's entries, S55 in B2/B3/B4's —
and S59 caught this file still describing the pre-B8b app one session after B closed. **When an item closes,
grep this file and the rubric for its name in the same commit.**)*

**✅ Spec §09 CLOSED (S56, B7) — there is exactly ONE freeform control.** `shared/freeform-field.tsx`:
mic, growing field (three lines then scrolls), cream send, **all three visible at rest**, in a 56px `L3
Control` container at r16. It is used by onboarding, the chef sheet (Plan + Groceries + You), Groceries
quick-add, the Plan intent screen, recipe modify and the generate dialog — **six sites, not the four §09's
prose names**, because that list was written in S39 and 1E.5 rebuilt Plan afterwards. `ui/textarea.tsx` was
deleted with it. Two things to design against rather than around: **the mic is real but unwired** (R1 is
text-only; it answers "Voice is coming soon"), and **search is deliberately not this control** — §09 keeps
it in header pattern B with a muted magnifier leading and no mic. ⚠️ The control's mic and send are **44px,
not the 40 §09's anatomy draws** — §12 item 05's floor beats the drawing and §11 bands icon buttons at
40–46 — which is why the container is 56 rather than 52.

**✅ Item 03 and the amber merge markers CLOSED (S52).** The cooked/complete checks are
`--spec-success` `#9CB86F` via the new `.spec-success-soft` utility — Griffin's call was that the check
**keeps a hue** rather than going neutral. The Groceries merge marker is now a **neutral inset carrying the
count as type** ("2 dinners"), which was the semantic decision this entry was waiting on: amber is the chef,
and a merge is a mechanical fact about the list. The `Plan draft` pill went neutral in the same pass — it
had stopped being indigo when 1E.7 aliased `--primary` to cream, so it was reading in the **action** hue,
which says "press me" about a label. `src/components/palette.test.ts` now fails the build on any
reintroduction.

**Design against the spec on the remaining items anyway** — they are the "before", the rest of the app is not.

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

**Type scale — §05's TEN rungs, all of them real classes as of S58. Use the class, never a raw size.**

| Class | Size / weight | What it names |
|---|---|---|
| `.spec-screen-title` | 32 / 700 / -.5px | H1. One per screen, left-aligned, never centred, max two lines |
| `.spec-spoken-headline` | 26 / 650 / -.4px | H2. **The chef talking at screen scale** — use when the sentence IS the screen |
| `.spec-feature-line` | 22 / 650 / -.3px | H3. Hero sentences. Centring is allowed here and only here |
| `.spec-group-title` | 19 / 650 / -.2px | H4. A group of rows — "Tuesday", "Ingredients" |
| `.spec-row-title` | 15.5 / 600 | H5. A row's own name. Always paired with a meta line beneath |
| `.spec-chef-voice` | 14.5 / 400 *italic* gold | The chef explaining a decision. **The only coloured running text in the product** |
| `.spec-body` | 13.5 / 400 | Running copy |
| `.spec-meta` | 12.5 / 400 muted | Facts about the row above, separated by ` · ` — never commas, never pills |
| `.spec-eyebrow` | 11 / 600 / 2px CAPS | Names a shelf of content, standing alone above it |
| `.spec-label` | 10.5 / 700 / 1.3px CAPS | Names a field or a slot INSIDE a card |

⚠️ **Two rungs are assigned by WHO IS SPEAKING, never by size, and this is the trap.** `.spec-chef-voice`
and `.spec-spoken-headline` both belong to the chef. B8b found the chef drawn at three different sizes
while **eight sites that were not the chef** sat on 14.5px because it was a convenient number — and
S59 found the same thing one rung up, with the Recipes and Groceries tab titles wearing the 26px
*spoken* headline because 26 was the number the design drew. **A near-miss of a rung is not evidence of
belonging to it.** Ask who is talking.

⚠️ **The ladder governs CONTENT, not controls.** §08 draws buttons at 15 / 14.5 / 13.5px and **15px is
deliberately not a §05 rung**. Text inputs hold **16px** because iOS Safari zooms the viewport on focus
below that. Asking "which rung does this take" of a button or an input has a third answer: neither.

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
