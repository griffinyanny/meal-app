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
- **You** (Phase 1E) — preferences audit, household, settings. The backstop.

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

**Token pin (from `src/app/globals.css`, dark-only):**
- bg `#0E0E10` (warm near-black, never `#000`) · surface-1 `#1A1A1E` · surface-2/muted/secondary `#22222A`
- foreground `#F5F5F7` · muted-foreground `#8E8E93` (day labels, meta, captions)
- **accent/primary/ring `#3A86FF`** — CTAs, chef-voice rationale, active states ONLY. Used sparingly.
- destructive `#FF453A` (muted use) · border `rgba(255,255,255,.08)` · radius base `.75rem` (cards use `radius-xl` ≈ 21px)

**Glass surfaces (the signature):**
- `.glass-surface` — hero cards: `rgba(26,26,30,.72)`, blur 24, saturate 180, border .06
- `.glass-card` — meal cards / list items: `rgba(34,34,42,.60)`, blur 16, saturate 150, border .06
- `.glass-sheet` — bottom sheets / sticky bars: `rgba(26,26,30,.96)`, blur 40, saturate 180, border .08

**Type scale (from shipped components):** hero 26/bold · section 20/bold · card title 17/semibold ·
chef rationale 13 in `primary/90` with trailing → · body 14 · meta 12 muted · **eyebrow 11
medium tracking-widest muted ALL-CAPS** (the one sanctioned all-caps use — day/section labels).
Font is the default system sans today; a distinctive display face is a 1F decision.

**Motion:** `.shimmer-bar` (AI-working) and `.animate-highlight-ring` (one-shot on change-landed).
**Icons:** lucide-react. Full written system: `Guidelines.md` (the aesthetic canon + anti-pattern list).

Visual reference cards for all of the above: `docs/design/system/*.html` (a descriptive snapshot).

## What "OPEN vs SETTLED" means in a brief

Every per-surface brief names two lists so we don't burn iteration on settled things:
- **OPEN — iterate here:** the genuinely undecided layout/interaction questions for this surface.
- **SETTLED — don't touch:** the tokens, glass surfaces, type scale, register, and hard
  constraints above. If a direction drifts these, it's noise to correct, not a decision.
