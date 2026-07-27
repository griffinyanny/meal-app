# Guidelines — Meal App (Figma Make Bridge Doc)

> **⚠️ DOUBLY SUPERSEDED — do not generate against this file.** It is a Figma-Make-era copy of
> `../Guidelines.md`, and its colour section is retired: **Design Specification v1.0
> (`design-spec.dc.html`, theme 11i) is canonical** — floor `#0F0B08`, gold `#E9B348` for the chef
> only, cream `#F4EBDC` for every action. `#0E0E10` and `#3A86FF` below are dead. The Figma Make
> workflow itself was replaced by Claude Design on 2026-07-13 (`../design-workflow.md`).

> **How to use this file**: Paste this entire document into the Figma Make code editor (Guidelines tab) before generating. Reuse across every Make session. Pair it with a per-screen brief (e.g. `brief-plan.md`) for each generation.

---

## 1. What we're building

An AI-powered meal management app. The user opens it, the AI proposes a personalized week of meals, the user reacts/tweaks/confirms, and a grocery list is ready in under 10 minutes. Personal chef on day one, gets smarter every week.

V1 is a **web app in phone form factor** (430px max width, full-width on mobile, bottom tab nav). The aesthetic targets the iOS-native feel of Crouton + Flighty, executed on web.

---

## 2. Core interaction model: "Content IS the Conversation"

This is the most important concept to internalize. Read carefully.

- **The system proposes, the user reacts.** Every screen the user lands on is pre-populated with an AI-generated proposal. They never face a blank state or a "create new" button as the primary action.
- **Not chat-first.** There is no ChatGPT-style chat thread that owns the experience. No persistent chat bar. No floating AI button. The AI shows up through the content itself.
- **Not static.** The screens are not pre-designed templates filled with data. They are dynamically assembled — different days/contexts/users see meaningfully different layouts. A Sunday-morning plan view and a Wednesday-evening plan view should look notably different, not just have different data.
- **The content IS the interaction surface.** Cards respond to swipe (left = show another, right = confirm). Rationale lines are tappable — they transform into contextual text inputs. Chips on cards are AI-generated and situation-specific. The user manipulates the AI's output directly, not through a separate input surface.
- **"Talk to the Chef" for free-form intent.** A clearly labeled, visible affordance on the hero card for when the user wants to express something in their own words: "I want to grill all weekend," "dinner party Saturday for 6," "use up the chicken in my fridge." Opens a text input with voice activation and rotating suggestion pills. Produces the same card-based output. This is the secondary path (20% of interactions), not the primary one.
- **The system explains itself.** Brief one-line rationale on AI-generated content: "Fish on Monday — freshest right after Sunday shopping." These rationale lines are mildly interactive — they hint at tappability through subtle visual treatment (accent color, faint arrow).
- **Structured clarification, not chat.** When the AI needs more input, it generates tappable option cards ("For your dinner party: grilling spread / family-style pasta / mezze platter"), not text questions. Reduces cognitive load. The AI does the narrowing; the user just picks.
- **The chef's voice runs through the output.** Plan-level: a 1-2 sentence header summarizing logic ("Built for your Saturday dinner party — 6 guests, grilling focus"). Card-level: rationale lines. Change-level: header refreshes when modifications are made ("Swapped Thursday to grilling — moved salmon to Wednesday for freshness").
- **Gets faster, not the same.** Week 1 asks more questions. Week 12 presents a near-final plan the user just confirms.
- **The screen adapts to state.** No plan ready → the screen leads with the input surface ("What are you thinking this week?"). Plan exists → the plan leads, with "Talk to the Chef" as secondary CTA. The balance shifts over time as the AI learns the user.

**The "personal chef" metaphor**: design as if a talented, opinionated human chef is doing the work. They check in, they remember, they have a point of view. They are not a survey form or a search bar. When they have a plan ready, they present it. When they're waiting for direction, they ask.

---

## 3. Information architecture

Four tabs, four nouns. Bottom tab bar.

1. **Plan** — Landing screen. AI-generated weekly meal plan. The input bar here doubles as the general "ask your chef anything" surface.
2. **Recipes** — Personal cookbook. Recents at top. AI-powered search/generation. All import methods. Cook mode is an immersive overlay accessed from a recipe, not a tab.
3. **Groceries** — Auto-synced shopping list. Check-off interface. (Pantry will live here in V1.5; checkout in V2 — leave room but don't design them yet.)
4. **You** — Preferences audit, household, settings. The backstop, not the primary experience.

**No persistent AI input bar.** No chat bar at the bottom of every screen. No sparkle button. No floating AI FAB. AI shows up through the content: rationale lines, contextual chips, generated cards. Free-form input is accessed through "Talk to the Chef" on the hero card of each tab — visible but not dominant.

No dedicated AI/Chat tab. Ever.

---

## 4. Design language

### Aesthetic targets

- **Dark mode first.** This is the default, not an option. Don't even generate light-mode variants unless explicitly asked.
- **Liquid glass spirit.** Translucent layered cards, soft backdrop blur, gentle depth. Web V1 doesn't need pixel-perfect iOS Liquid Glass — it needs the *feel*. Approximate with subtle gradients, blur, and layered surfaces.
- **Rich, serious, dense — but airy and usable.** Flighty's design brief, copy-pasted. Show information confidently. Use whitespace as a feature, not a void.

### Color

- **Background**: Near-black with a hint of warmth. Not pure #000. Think `#0E0E10` to `#141418`. Layered surfaces slightly lighter (`#1A1A1E`, `#22222A`).
- **Primary accent**: A single bold accent color, used sparingly for CTAs, active states, and meaningful highlights. **Starting point: a deep desaturated blue** (Crouton-adjacent — e.g. `#3A86FF` or similar). Open to iteration toward warmer tones (amber/orange) once we see screens. Pick one and commit per generation.
- **Semantic colors**: Subtle — success/warning/error should be present but never garish. Muted greens, ambers, reds.
- **Food imagery**: Food photography is the warmth in the UI. The chrome stays cool/neutral so food pops.

### Typography

- **Bold hierarchy.** Big, confident headers. Medium body. Small captions. Strong weight differences. Mela and Flighty are references.
- **Suggested stack**: A serif or distinctive sans-serif for hero headers (e.g., a serif like Fraunces, Tiempos, or a high-quality sans like Söhne / Inter Display). System sans for body.
- **No all-caps decorative type.** No script fonts. No "fun" display fonts. Ever.

### Components

- **Cards as glass surfaces**: Rounded corners (~16-20px), soft border (1px subtle inner glow or 1px low-opacity stroke), subtle backdrop blur where layered over imagery.
- **"Talk to the Chef" input surface**: Glass bottom sheet or inline expansion. Text field with mic icon. Suggestion pills inside. Opens from hero card CTA or leads the screen when no plan exists.
- **Bottom sheets / cards over content** (Flighty pattern): For deeper AI interactions, recipe detail invocations, modifications. Glass card that pulls up from the bottom, content behind dims slightly.
- **Smart inline features** (Crouton pattern): Ingredient mentions and time mentions inside recipe text are interactive — tappable. "Bake for 10-12 minutes" → tap → timer starts. Rationale lines on AI-generated cards are similarly tappable.
- **Suggestion pills**: Rounded full, glass surface, subtle border. Used for refinement chips, quick-response options, AI prompts. Appear inside the input surface when active.
- **Option cards**: Glass surface, rounded, tappable. Used when the AI presents 2-3 choices for the user to pick between. Each card has a title and brief description.
- **Contextual chips**: Small, rounded, glass. Sit on or near meal cards. AI-generated per situation. 2-3 per card max.
- **Toast notifications**: Subtle, glass-style, non-intrusive. "Added 9 items to Groceries." Never modal. Never celebrating.

### Form factor

- **Phone form factor on web**: max-width 430px, centered on desktop with a subtle ambient background outside the frame (gradient, blurred), full-width on mobile.
- **Bottom tab bar** (4 tabs, glass surface, ~80px tall including safe area). Active tab indicated by accent color + icon weight change. Never with a pill background — too playful.
- **Safe-area padding** top and bottom on mobile.

---

## 5. AI surface patterns

These are the visual/interaction conventions for how AI shows up in the product. Reuse them consistently.

### "Talk to the Chef" input surface
- NOT a persistent bar. A labeled action that lives on the hero card of each tab as a secondary CTA.
- On Plan: sits next to "Looks good →" as the secondary action. Label: "Talk to the Chef" (working label).
- Tapping it opens an input surface: glass bottom sheet or inline expansion with text field, mic icon (voice), and suggestion pills.
- When no plan exists (first use, start of week), the input surface leads the screen instead of being secondary.

### Suggestion pills
- Appear inside the "Talk to the Chef" input surface when active, and during the "no plan" input-led state.
- Horizontally scrollable. 3-5 pills. Glass surface, subtle border.
- Content is contextual + personalized: "Plan a dinner party for Saturday," "I want to grill all weekend," "Use up the chicken in my fridge," "Something quick — I'm exhausted."
- Tap = executes the intent (AI generates a plan/response based on the pill).

### Rationale lines (interactive)
- One-line "why" on every AI-generated card. Muted but readable.
- Subtly styled to hint at interactivity: accent color text, or a faint "→" glyph, or slight visual difference from static text.
- Tapping a rationale line transforms it into a scoped text input for that card — the user types OVER the AI's reasoning with their own intent.

### Contextual chips on cards
- Situation-specific action chips that appear on or near meal cards. NOT static "cheaper / faster" options — the AI generates them based on context.
- Examples: "Make with leftover chicken from Monday" / "Convert to one-pan" / "Cut prep to 15 min" / "Boost protein."
- Small, rounded, glass surface. Appear 2-3 per card, only the most relevant.

### Option cards (structured clarification)
- When the AI needs to narrow intent after a complex request, it generates 2-3 tappable option cards.
- Each card: title, 1-line description, optional small image or icon. Glass surface.
- Preceded by a brief chef-voice header: "For your Saturday dinner party, I'm thinking:"
- Below the options: a subtle "None of these — tell me more" escape hatch.

### "Thinking" states
- Named, descriptive. Never just a spinner.
- Examples: "Brainstorming dinners…," "Checking your pantry…," "Pulling together your list…"
- Use a subtle animated state (pulsing dot, shimmer line) — never confetti, never bouncing.
- Steps can be shown progressively: "✓ Reviewing your preferences → Generating proposals → Building your list"

### Chef-voice headers
- Brief 1-2 sentence headers that acknowledge the user's input and explain the AI's logic.
- Appear at the top of a generated or updated plan: "Built for your Saturday dinner party — 6 guests, grilling focus, baby-friendly sides."
- When the plan updates after a modification: "Swapped Thursday to grilling — moved the salmon to Wednesday for freshness."
- Tone: direct, confident, brief. Not chatty.

### Memory confirmations
- When the AI captures a preference, show a small, subtle confirmation toast: "Got it — I'll remember you prefer chicken over beef." Glass-style, dismissible, non-intrusive.

---

## 6. Voice & personality

- **Direct and opinionated.** "Here's your week." Not "Would you like me to suggest some meals?"
- **No sycophancy.** Don't praise the user. Don't say "Great choice!" Don't apologize for nothing.
- **Brief.** One line where one line works. Two lines max for explanations.
- **Confident, not chirpy.** "Updated." not "All done! ✨"
- **No emojis in UI copy.** Ever. (User-generated content like recipe titles can have them — the system doesn't.)

---

## 7. Anti-patterns — do NOT do these

These are the failure modes of the competitive set. Avoid them at all costs.

- ❌ Food emojis as design elements (🍕🥗🍳 in headers, buttons, modal art). NEVER.
- ❌ Cartoon illustrations, mascot characters, "friendly" graphics.
- ❌ Confetti, celebrations, "You did it!" moments. Confirm calmly with a toast.
- ❌ All-caps headers. Pill-shaped tab indicators with bright fills.
- ❌ Bright primary colors layered on bright primary colors (Mealime/Cooklist palette).
- ❌ Light mode by default. Light mode at all in V1.
- ❌ Forced setup flows that gate access ("Set up your pantry before continuing").
- ❌ Modal blockers that don't have an immediate "skip" or "later."
- ❌ Generic "Create New" CTAs as the primary screen action. The AI proposes; the user reacts.
- ❌ Dense form-style settings screens. Settings should feel like reviewing what the chef knows, not configuring software.
- ❌ Loading spinners with no context. Always say what's happening.
- ❌ Empty states that say "No recipes yet!" with an illustration. If there's nothing, the AI proposes something.
- ❌ Floating AI FABs / sparkle buttons. No generic AI icons floating over content.
- ❌ Persistent chat bars at the bottom of every screen. Input is accessed through "Talk to the Chef," not a permanent text field.

---

## 8. Reference apps (in priority order)

When stuck, look here for execution patterns:

1. **Crouton** — recipe app aesthetic. Dark mode, glass cards, tappable smart text in recipes, scaling UX, cook mode. The MVP visual baseline.
2. **Flighty** — premium quality bar. Bottom card modality. Dense-but-airy data presentation. Aspirational.
3. **Robinhood** — 4-tab IA with depth. Geometric illustration style. Bold colors on black. Information density.
4. **Mela** — minimalism reference. Single bold accent + whitespace + serif headers = premium feel.
5. **Function Health** — interaction model reference for static-to-AI transitions. Progress steps in chat ("Building your protocol… ✓ Reviewing your data"). Suggestion pills.

Anti-references (do not emulate): Cooklist, Mealime, Samsung Food, PlateJoy, generic green/white meal planning apps.

---

## 9. Per-screen brief format

Every Figma Make generation pairs this Guidelines.md with a screen-specific brief. The brief will tell Make:
- What screen this is and what tab it lives in
- The state(s) to design (e.g., "Sunday morning fresh week" vs "Wednesday evening mid-week")
- Content/data to populate the screen with (so Make doesn't invent generic placeholders)
- Specific interactions and AI behaviors on this screen

The brief is the prompt. This Guidelines.md is the always-on context.
