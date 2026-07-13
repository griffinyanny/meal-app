# Briefs — Plan Screen States (V1)

> **How to use this file**: The per-state brief format (Figma-Make-era; now fed to Claude Design — see `design-workflow.md`). Each state is a separate generation prompt. Phone form factor: 430px wide, ~932px tall, dark mode only. This file's format is the template for future per-surface briefs.

---

## State 1: Plan Ready — Weekly Review (Refined Sunday Morning)

> This refines the existing Sunday morning prototype. Key changes: NO floating sparkle FAB, NO persistent input bar at bottom, "Talk to the Chef" replaces "Make changes," subtle swipe hint on cards, rationale lines styled as mildly interactive.

### Screen layout, top to bottom:

**1. Top bar (~52px)**
- Left: "Good morning, Griffin" (glass surface, subtle)
- Right: small settings gear icon
- No big header — the tab bar names the screen

**2. Hero card (glass surface, prominent)**
- Title: **"Your week, ready to review"** (bold, confident)
- Rationale line in accent color or muted-but-distinct style: "Built around your busy Thursday and a grocery run Sunday."
- Stats row (small, muted): "5 dinners · ~$87 estimated · ~12 ingredients to buy"
- Below stats: small text link "Why this week? →" (muted, discoverable — opens a sheet with the chef's full reasoning. Don't design the sheet, just show the link.)
- Two actions side by side:
  - Primary: **"Looks good →"** button (accent-colored, filled)
  - Secondary: **"Talk to the Chef"** (text link style, clearly labeled, not an icon)

**3. Meal cards (vertical list, 5 cards)**

Each card is a glass surface with:
- Day label (small, muted): "SUNDAY · TONIGHT"
- Recipe title (bold, ~18px): e.g., "Miso-Glazed Salmon with Bok Choy"
- Food photo (~80px square thumbnail on the right side of the card)
- Rationale line (muted but with a SUBTLE visual cue that it's tappable — accent-colored text, or a tiny "→" glyph at the end): "Fresh fish right after Sunday shopping — best window."
- Meta row (small): "35 min · serves 2 · Fish · Asian"
- 2 contextual chips below the meta row (small, rounded, glass): These are AI-generated suggestions specific to this card. E.g., "Make it spicier" · "Swap protein"

Cards are tappable — tapping opens an expanded card bottom sheet (see State 5). The contextual chips and tappable rationale lines communicate interactivity. No swipe peek hints needed.

**Sample meals (use these exact names):**
1. Sunday — Miso-Glazed Salmon with Bok Choy / "Fresh fish right after Sunday shopping — best window." / Chips: "Make it spicier" · "Swap protein"
2. Monday — Sheet-Pan Chicken Shawarma with Cucumber Yogurt / "Make extra — you'll use the leftovers Wednesday." / Chips: "One-pan version" · "Double batch"
3. Tuesday — Beef and Broccoli Stir-Fry / "Quick weeknight pick — 25 minutes start to finish." / Chips: "Make it lighter" · "Add a side"
4. Wednesday — Leftover Chicken Salad Wraps / "Uses Monday's leftover chicken — no new protein needed." / Chips: "Warm version" · "Make it a bowl"
5. Friday — Cast-Iron Steak with Roasted Potatoes / "Weekend treat. Pair with a good red." / Chips: "Grill instead" · "Add a salad"

Thursday is skipped — show a minimal card: "Thursday — Eating out" with muted styling. No photo, no chips. Visually de-emphasized.

**4. Sticky bottom confirm bar (when scrolled)**
- When the hero card's "Looks good" scrolls out of view, a sticky glass bar appears above the tab bar.
- Contains: small muted text "5 dinners ready" on the left, accent-colored "Looks good →" button on the right.
- Glass/translucent with backdrop blur. Lightweight, not a heavy toolbar.
- Show the screen in a state where the hero has scrolled off and this bar is visible.

**5. Bottom tab bar**
- Four tabs: Plan (calendar icon, active, accent color) | Recipes | Groceries | You
- Glass surface. ~80px tall. Simple icons + labels.
- NO input bar above the tab bar. NO sparkle FAB anywhere.

### What NOT to include
- Any floating AI button, FAB, or sparkle icon
- A persistent text input bar at the bottom of the screen
- A toggle between states (like "Sunday / Wednesday") — this is ONE state
- Emojis, celebration graphics, confetti
- Calendar or date picker UI
- Light mode

---

## State 2: "Talk to the Chef" — Input Active

> The user tapped "Talk to the Chef" on the hero card. A glass bottom sheet has risen over the plan. The user is about to express intent in their own words.

### Screen layout, top to bottom:

**1. Background (dimmed)**
- The plan from State 1 is visible but dimmed/blurred behind the bottom sheet. The hero card and top of the meal list should be partially visible, showing continuity.

**2. Glass bottom sheet (rises from bottom, covers ~60% of screen)**
- Rounded top corners (~20px). Glass surface with strong backdrop blur.
- **Header area at top of sheet:**
  - Small chef-voice text: "What are you thinking?" (confident, not "How can I help you?")
  - Subtle close X in the top-right corner of the sheet

- **Suggestion pills (horizontally scrollable row):**
  - "Plan a dinner party for Saturday"
  - "I want to grill all weekend"
  - "Use up the chicken in my fridge"
  - "Something quick — I'm exhausted"
  - These are examples that teach users what's possible. Glass surface, rounded, tappable.

- **Text input area:**
  - Large, comfortable text field. Glass surface. Placeholder text: "Tell me what you're thinking this week…"
  - Mic icon on the right side of the text field (voice dictation — always visible)
  - The text field should feel generous — not a cramped single-line input. At least 2-3 lines tall.

- **Below the input, small muted text:**
  - "Try dictating — it's faster" (subtle encouragement for voice input)

**3. Bottom tab bar**
- Same as always, partially visible below the sheet

### Visual notes
- The bottom sheet should feel like a natural overlay — the plan is still "there" behind it
- The suggestion pills are the most important element besides the text field — they teach the interaction
- The text field should feel inviting, not like a search bar. It's for expressing intent, not querying.
- No keyboard shown — design as if the keyboard hasn't risen yet (user is seeing the surface before tapping the field)

### What NOT to include
- A chat thread or message bubbles
- An AI avatar or assistant icon
- A "send" button that looks like a chat send — if there's a submit action, label it "Go" or use an arrow
- Any reference to "AI" or "assistant" — this is "the chef"

---

## State 3: No Plan Yet — Input-Led (First Use / Start of Week)

> The user opens the app and there's no generated plan. Maybe it's their first time, or the week hasn't been planned yet. The screen leads with the input surface because the AI is waiting for direction.

### Screen layout, top to bottom:

**1. Top bar (~52px)**
- Left: "Good morning, Griffin" (or "Welcome to [app name]" for true first use)
- Right: settings gear icon
- Glass surface

**2. Hero area (generous, centered, inviting)**
- This is NOT the plan hero card — there's no plan yet.
- Large, confident text: **"What are you thinking this week?"** (bold, hero-sized, centered or left-aligned)
- Subtitle (muted): "Tell me what you're in the mood for, or I'll figure it out."

**3. Suggestion pills (prominent, 2 rows or a generous grid)**
- These should be MORE prominent than in State 2 because they're the primary way to start here.
- Row 1: "Healthy weeknight dinners" · "I want to grill" · "Kid-friendly meals"
- Row 2: "Use what's in my fridge" · "Dinner party Saturday" · "Surprise me"
- "Surprise me" is the passive option — the AI just generates a plan based on what it knows.
- Glass surface, slightly larger than the pills in State 2. These are primary actions, not secondary suggestions.

**4. Text input area**
- Same generous text field as State 2, but positioned inline on the main screen (not in a bottom sheet).
- Placeholder: "Or just start talking — what sounds good?"
- Mic icon on the right. The voice-first hint is stronger here.
- Below: "Try: 'Four dinners, grill two, nothing too heavy'" — a concrete example in muted text.

**5. Muted lower section (if there's room)**
- Small text: "Or let your chef figure it out →" — tapping this generates a fully AI-driven plan with no user input. For users who just want to see what happens.
- If the user has history, maybe: "Last week you loved the Chicken Shawarma — want to build from there?"

**6. Bottom tab bar**
- Same as always. Plan is active.

### Visual notes
- This screen should feel warm and inviting, not empty. The absence of a plan is an OPPORTUNITY, not a void.
- The suggestion pills are the hero element — they show what's possible and reduce the blank-page problem.
- The text input is secondary to the pills but clearly available.
- Good whitespace. The screen should feel calm, not busy.

### What NOT to include
- An empty calendar or blank meal slots ("Monday: ___, Tuesday: ___")
- A "Create Plan" button as the primary action
- Onboarding tooltips, welcome modals, or tutorials
- A generic illustration of food or a chef mascot
- Any sense of "nothing to see here" — the screen IS the beginning of the interaction

---

## State 4: Structured Clarification — Option Cards

> The user said something complex like "Plan a dinner party for Saturday, 6 people." The AI needs to narrow the direction before generating a full plan. It presents option cards.

### Screen layout, top to bottom:

**1. Top bar (~52px)**
- "Saturday evening" or "Good morning, Griffin" — contextual to when this happens
- Settings gear icon on right

**2. Chef-voice header (glass surface or subtle card)**
- Brief text: **"For your Saturday dinner party — 6 guests. Here's what I'm thinking:"**
- This is the AI acknowledging what it heard and proving it understood. Confident, specific.

**3. Option cards (2-3 cards, vertically stacked, equal prominence)**

Each option card is a glass surface, tappable, with:
- **Option title** (bold): e.g., "Summer Grilling Spread"
- **1-2 line description** (muted): "Marinated flank steak, grilled corn salad, watermelon feta bites. Casual, impressive, mostly make-ahead."
- **Small food image** on the right or as a subtle background (optional — if it helps the card feel distinct)
- **Small meta detail** (very subtle): "~$65 · 2 hr prep"

**Three specific options to show:**
1. **"Summer Grilling Spread"** — "Marinated flank steak, grilled corn salad, watermelon feta bites. Casual, impressive, mostly make-ahead." / ~$65 · 2 hr prep
2. **"Family-Style Italian"** — "Handmade pasta with bolognese, roasted broccoli, garlic bread. Comfort food that feeds a crowd." / ~$55 · 2.5 hr prep
3. **"Mediterranean Mezze"** — "Lamb kofta, hummus, tabbouleh, warm pita. Spread-style — great for conversation and grazing." / ~$50 · 1.5 hr prep

**4. Escape hatch (below the option cards)**
- Small text link: "None of these — let me tell you more"
- Tapping this would open the "Talk to the Chef" input surface (State 2) for more specific direction.

**5. Bottom tab bar**
- Same as always.

### Visual notes
- The option cards should feel like CHOICES, not a list. Equal visual weight. Each one is a genuine direction.
- The chef-voice header at the top is important — it proves the AI heard the request and is narrowing intelligently, not just throwing options at you.
- This screen should feel like a moment — the chef pausing to ask "which direction?" before cooking. Brief, useful, not tedious.
- The cards should feel immediately tappable. Clear affordance that these are choices to pick from.

### What NOT to include
- A chat thread showing the user's original message above
- More than 3 options (decision paralysis)
- "What would you prefer?" or "Which sounds best?" — the options speak for themselves
- A back button or navigation that implies this is a multi-step wizard
- Any option labeled "Other" — the escape hatch text below covers that

---

## State 5: Expanded Card — Recipe Preview + Contextual Actions

> The user tapped a meal card from the plan. A glass bottom sheet rises showing the recipe preview AND AI-generated contextual actions. This is where the user decides what to do: read the recipe, modify it, move it, swap it, or start cooking.

### Screen layout:

**1. Background (dimmed)**
- The plan view is visible but dimmed/blurred behind the bottom sheet. The card the user tapped should be roughly aligned with the top of the sheet, showing context for which meal they're looking at.

**2. Glass bottom sheet (rises from bottom, covers ~70% of screen)**
- Rounded top corners (~20px). Glass surface with strong backdrop blur.

**Recipe preview area (top of sheet):**
- **Large hero food image** spanning the full width of the sheet (~200px tall). The recipe photo should feel generous and appetizing.
- **Day + meal label** (small, muted): "MONDAY · DINNER"
- **Recipe title** (bold, large): "Sheet-Pan Chicken Shawarma with Cucumber Yogurt"
- **Rationale line** (accent-colored, with →): "Make extra — you'll use the leftovers Wednesday."
- **Meta row**: "40 min · serves 4 · Chicken · Mediterranean"
- **Ingredient preview** (compact): "Chicken thighs, yogurt, cucumber, spices, pita, tomato" — a single comma-separated line or small horizontally scrollable pills showing the main ingredients. Tappable — would eventually open full ingredient list.

**AI-generated contextual actions (below the recipe preview):**
- Section header (small, muted): "What would you like to do?"
- **Action chips in a grid or vertical stack** (glass surface, tappable, each with a short label):

For this Monday shawarma card specifically:
  - "Start cooking →" (accent-colored, if this is tonight's meal — otherwise omit)
  - "Move to another day"
  - "Swap for something else"
  - "One-pan version"
  - "Double the batch"
  - "Make it kid-friendly"
  - "Add to grocery list"

IMPORTANT: These actions are AI-GENERATED and differ per card. They are NOT a static menu. For a different card (say, the Friday steak), the options might be: "Grill instead of cast iron" / "Add a salad" / "Make it a date night" / "Swap for something lighter." The AI surfaces what's contextually relevant.

**Escape hatch at the bottom of the sheet:**
- Small text link: "Something else? Tell your chef" — tapping this opens the Talk to the Chef input (State 2) scoped to this card.

**Close affordance:**
- Subtle drag-down handle at the top of the sheet (standard iOS sheet pattern)
- Or subtle X in the top-right corner

**3. Bottom tab bar**
- Partially visible below the sheet.

### Visual notes
- This sheet combines TWO jobs: recipe preview AND contextual interaction. It should NOT feel like a recipe detail page that's been crammed with buttons. The recipe preview is the context; the actions are the purpose.
- The action chips should feel like natural suggestions, not a toolbar. Think of them as the chef saying "Here's what I can do with this one."
- The hero image is important — it makes the sheet feel like it's about THIS meal specifically, not a generic action menu.
- The "Move to another day" action would show day options as pills (Mon / Tue / Wed / Thu / Fri / Sat) when tapped — don't design that secondary step, just show the initial chip.
- If this card is tonight's meal, "Start cooking →" should be visually primary (accent-colored). Otherwise it doesn't appear.

### What NOT to include
- A full recipe detail page with complete ingredients and steps — this is a PREVIEW + ACTIONS sheet, not the recipe page itself
- A three-dot or hamburger menu
- Static/generic actions that are the same on every card — the actions MUST feel specific to this meal
- "Delete" or "Remove" as a visible action — if needed, it's at the very bottom, de-emphasized
- An AI avatar or chat thread
- More than 6-7 action chips — keep it focused

### Alternate version to consider (optional second generation)
Show the same expanded card for the **Wednesday leftover wraps** to demonstrate how the AI-generated actions differ. For that card, the actions might be:
- "Start cooking →" (it's tonight)
- "I didn't cook Monday's chicken — suggest something else"
- "Make it a warm version"
- "Make it a bowl instead"
- "Skip — I'll eat out tonight"

This contrast proves the actions are contextual, not a fixed menu.

---

## State 6: Mid-Week Evening (Refined Wednesday)

> It's 6pm Wednesday. Monday and Tuesday's meals are done. Tonight is in focus. Thursday/Friday are upcoming. The screen reorganizes around "what's next" — tonight's meal is the hero, past meals are compressed with feedback, upcoming meals show the same card+chip pattern as State 1.

### Screen layout, top to bottom:

**1. Top bar (~52px)**
- Left: "Wednesday evening" (not "Good morning" — time-aware greeting)
- Right: settings gear icon
- Glass surface

**2. Tonight's meal — hero card (glass surface, PROMINENT)**
This is the most important element on screen. It should feel like the plan is pointing at this one meal.
- **Large hero food image** spanning the full card width or near-full (~180px tall). Appetizing, warm.
- **Eyebrow label** (small, muted): "TONIGHT · WEDNESDAY"
- **Recipe title** (bold, large): "Leftover Chicken Salad Wraps"
- **Rationale line** (accent-colored, with →): "Uses Monday's leftover chicken — no new protein needed."
- **Meta row**: "~15 min · serves 2 · Chicken · Light"
- **Primary CTA**: "Start cooking →" (accent-colored, filled button — this is the dominant action)
- **Secondary**: "Not feeling it? Swap for something else" (text link, muted)
- **2 contextual chips**: "Make it warm" · "Make it a bowl"

**3. Past meals section — "Earlier this week"**
A compressed section with muted styling. These meals are done — the system is collecting lightweight feedback.

Section header (small, muted): "EARLIER THIS WEEK"

Each past meal is a **compact card** (glass surface, slightly dimmed compared to tonight/upcoming):
- Single row layout: day label + recipe title + small thumbnail on the right
- **Monday** — "Sheet-Pan Chicken Shawarma" / ✓ Completed / small thumbnail
- **Tuesday** — "Beef and Broccoli Stir-Fry" / ✓ Completed / small thumbnail
- Each card has **two small feedback icons** inline: thumbs-up and thumbs-down (subtle icon glyphs, NOT emoji). Tapping one saves to memory. If already tapped, the selected thumb is accent-colored.
- These cards are NOT tappable for expansion or actions — they're done. The feedback icons are the only interaction.

Design note: This section should feel lightweight and secondary. The user should be able to glance at it and move on. Don't give these cards the same visual weight as tonight's hero or upcoming meals.

**4. Upcoming meals section — "Coming up"**
The remaining planned meals for the week. Same card pattern as State 1 but slightly more compact.

Section header (small, muted): "COMING UP"

Cards for:
- **Thursday** — "Eating out" (minimal card, muted, no photo, no chips — same as State 1's skip card)
- **Friday** — "Cast-Iron Steak with Roasted Potatoes" / "Weekend treat. Pair with a good red." / Chips: "Grill instead" · "Add a salad" / thumbnail
- If Saturday has a meal, show it. Otherwise: a subtle line — "Saturday — nothing planned yet. Talk to the Chef →" (This becomes a contextual entry point to the input surface for adding a meal.)

These cards are tappable (open State 5 expanded card) and show contextual chips, just like State 1.

**5. "Talk to the Chef" affordance**
- Below the upcoming meals, a subtle but visible text line: "Anything to adjust for the rest of the week? Talk to the Chef →"
- This replaces the hero card's "Talk to the Chef" since the hero is now tonight's meal, not the plan summary. The affordance moves to the bottom of the content, after the user has seen everything.

**6. Sticky bottom confirm bar (if plan isn't confirmed yet)**
- If the user hasn't confirmed the plan, the same sticky bar from State 1 appears: "3 meals remaining — Looks good →"
- If the plan IS already confirmed, this bar doesn't appear. The screen is purely about execution at that point.

**7. Bottom tab bar**
- Same as always. Plan active (calendar icon).

### Key differences from State 1 (Sunday)
| Element | Sunday (State 1) | Wednesday (State 6) |
|---------|------------------|---------------------|
| Hero card | Plan summary ("Your week, ready to review") | Tonight's meal with "Start cooking →" |
| "Looks good" | Top of screen on hero card | Sticky bottom bar (if plan not yet confirmed) |
| "Talk to the Chef" | On hero card as secondary CTA | Below upcoming meals as text link |
| Past meals | Don't exist yet — all meals are future | Compressed with feedback thumbs |
| Upcoming meals | All 5+ meals in full card format | Only remaining days, slightly compact |
| Overall feel | "Review the whole week" | "What's for dinner tonight + what's coming" |

### Suggestion pills (if Talk to the Chef is opened from this screen)
Contextual to mid-week:
- "What can I prep for tomorrow?"
- "Got more leftovers — any ideas?"
- "Move Friday's steak to Saturday"
- "Add a meal for Saturday"

### What NOT to include
- A full weekly overview — the week is in progress, not under review
- Monday/Tuesday's meals at full size — they're done, they're compressed
- A "Replan the week" button — mid-week replanning happens through Talk to the Chef, not a reset
- Nutrition or spending summaries (V3)
- Emojis, celebration graphics for completed meals
- The sparkle FAB or persistent input bar
- A toggle between Sunday/Wednesday views — this is ONE state

---

## Generation Notes for All States

- **Phone form factor**: 430px wide, ~932px tall (iPhone 15 Pro proportions). Dark mode only.
- **Visual consistency**: All four states should look like they belong to the same app. Same color palette, same glass treatment, same typography. The tab bar and top bar should be identical across states.
- **Generate each state as a separate frame.** Do not combine them or add toggles between them.
- **Use real food photography** (or photo-style placeholders). No illustrated food, no clipart, no emojis.
- **Refer to Guidelines.md** for colors, typography, components, anti-patterns. This brief assumes that document is loaded.
