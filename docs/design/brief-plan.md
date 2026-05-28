# Brief — Plan Screen (V1)

> **How to use this file**: Paste this as the Figma Make generation prompt, with `Guidelines.md` already loaded into the Make Guidelines tab. This brief describes the **Plan** tab — the landing screen and primary AI surface of the app.

---

## What this screen is

The **Plan tab** is the landing screen of the meal app. It's where the user lands when they open the app. It shows the AI-generated weekly meal plan and serves as the general "talk to your chef" surface.

This is the most important screen in the product. The bet — "AI generates the UI" — lives here. Every visual and interaction decision should reinforce: *the system has already done the work; the user is here to react.*

---

## Two states to design

Design **two distinct versions** of this screen, side by side. They share the same tab and IA but should feel meaningfully different — proving the "dynamically assembled" promise.

### State A: Sunday morning, fresh week

The user just opened the app at 10am Sunday. The AI has prepared a proposal for the upcoming week. Nothing has been confirmed yet. This is the "review the chef's draft" moment.

### State B: Wednesday evening, mid-week

The user opens the app at 6pm Wednesday. Monday and Tuesday's meals are done. Tonight (Wednesday) is in progress. Thursday/Friday/Saturday are upcoming. The view is reorganized around "what's next" and "how did the past few days go."

---

## Shared structure (both states)

Top to bottom:

1. **Top app bar** (~52px) — Small greeting on the left ("Good morning, Griffin" / "Wednesday evening"). On the right, a subtle settings/avatar icon. No big "Plan" header — the tab bar already names the screen. Glass surface.

2. **Hero area** — A single prominent card or row that anchors the screen for the current state. Different per state (see below).

3. **Meal list / weekly view** — The meals themselves. Cards. Different layouts per state (see below).

4. **Sticky AI input bar + suggestion pills** above the tab bar. Glass surface. Rotating placeholder text. Mic icon visible. Pills above it.

5. **Bottom tab bar** — Plan (active) | Recipes | Groceries | You. 4 tabs, glass surface, ~80px tall.

---

## State A — Sunday morning, fresh week

### Hero area
A "your week" header card. Glass surface. Contains:
- Title: "Your week, ready to review" (or similar — confident, not "Suggested Meal Plan ✨").
- One-line rationale: "Built around your busy Thursday and a grocery run Sunday."
- Small affordance: "Looks good →" CTA (subtle, accent-colored) and a secondary "Make changes" link.
- Optional: a tiny status row — "5 dinners · ~$87 estimated · ~12 ingredients to buy" (data visible, no bar charts).

### Meal list
A vertical list of 5 meal cards (one per planned dinner). Each card:
- **Day label** (small caps or muted tone): "Sunday · Tonight"
- **Recipe title** (bold, ~18px): "Miso-Glazed Salmon with Bok Choy"
- **Photo** on the right (or full-bleed at top of card) — ~80px square thumbnail or full-bleed hero image. Food photography is the warmth in the UI.
- **One-line "why"** in muted tone: "Fresh fish right after Sunday shopping — best window."
- **Meta row** (small): time estimate, serving count, dietary tags.
- **Subtle tappable affordance**: tapping the card opens a bottom-sheet recipe preview (don't fully design this, just imply it).

Sample meals to populate (use these, not generic placeholders):
1. Sunday — Miso-Glazed Salmon with Bok Choy
2. Monday — Sheet-Pan Chicken Shawarma with Cucumber Yogurt
3. Tuesday — Beef and Broccoli Stir-Fry (quick — busy weeknight)
4. Wednesday — Leftover Chicken Salad Wraps (uses Monday's chicken)
5. Thursday — Skip / Eating out
6. Friday — Cast-Iron Steak with Roasted Potatoes (weekend treat)

Note that Thursday is a "skip" — design what that looks like (a card that says "Eating out — no plan needed," visually de-emphasized but still present).

### Suggestion pills above the input bar
Three to five pills, horizontally scrollable:
- "Make Thursday lighter"
- "I want to grill this weekend"
- "Swap the salmon"
- "Show me the grocery list"
- "Repeat last week"

### Input bar placeholder
Rotating between:
- "Tell your chef what to change…"
- "Make Thursday lighter…"
- "What about dinner with friends?"

---

## State B — Wednesday evening, mid-week

### Hero area
A "tonight" card. Glass surface, more prominent than other cards. Contains:
- Eyebrow label: "Tonight · Wednesday"
- Title: "Leftover Chicken Salad Wraps"
- Photo (full-bleed top or large thumbnail)
- Status row: "Uses Monday's leftover chicken · ~15 min · serves 2"
- **Primary CTA**: "Start cooking →" (accent color, opens cook mode overlay — don't design the cook mode here, just imply the entry point)
- **Secondary**: subtle "Not feeling it? Swap for something else" link

### Meal list
Reorganized into three sections, scannable:

**Past (this week)** — small section, muted, collapsed feel:
- Monday — Sheet-Pan Chicken Shawarma (check mark, "👍" / "👎" thumbs as subtle inline buttons — NO emoji, use tiny icon glyphs)
- Tuesday — Beef and Broccoli Stir-Fry (check mark, thumbs)
- Lightweight feedback. Tapping a thumb saves to memory; show a tiny toast confirmation "Got it — I'll remember."

**Tonight** — the hero card above.

**Coming up** — Thursday, Friday, Saturday cards in the same style as State A but slightly more compact. Sunday is implied as "Next week — your chef is already thinking about it."

### Suggestion pills above the input bar
Contextual to mid-week:
- "What can I prep for tomorrow?"
- "Got more leftovers — any ideas?"
- "Move Friday's steak to Saturday"
- "How's my grocery list looking?"

### Input bar placeholder
- "Anything to adjust for the rest of the week?"

---

## Visual / interaction notes

- **Glass everywhere.** Cards should feel like layered glass with subtle backdrop blur. Background should have a soft ambient gradient or texture that the cards float on top of.
- **Food imagery should pop.** Real-looking food photos (or stand-in placeholders that are clearly photographic, not illustrated). The chrome stays cool/neutral so food brings the warmth.
- **Strong typography hierarchy.** Recipe titles are confident. Day labels are subdued. "Why this" rationale is muted but readable.
- **Subtle accent color usage.** Primary CTAs and active states only. Don't paint the screen blue.
- **No celebration anywhere.** Past meals show calm completion — a check, a thumbs option. No confetti, no "Nice job!"
- **The AI is present but not loud.** No big "AI ✨" labels. The AI quality shows through the proposals being good and personalized, not through chrome that announces AI-ness.

---

## What NOT to include in this screen

- A "Create new plan" button as a primary action.
- A blank-state empty calendar.
- Day-of-week pickers, date pickers, or calendar grids. This is a weekly list, not a calendar.
- Macro/nutrition charts (V3 — not now).
- Pantry status (V1.5 — not now).
- A "Chat" or "AI" button. The input bar IS the AI.
- Onboarding cards, tooltips, "Welcome!" modals.
- Any reference to settings, accounts, or login.

---

## Generation guidance for Make

- Generate both states as separate but visually consistent frames. Show them side by side if possible.
- Phone form factor: 430px wide, ~932px tall (iPhone 15 Pro frame).
- Dark mode only.
- Use real food imagery (or photo-style placeholders) for recipe thumbnails.
- Use the meal content listed above — do not invent generic placeholders like "Recipe 1," "Meal A."
- Refer to Guidelines.md for design language, colors, components, anti-patterns. This brief assumes that document is loaded.
