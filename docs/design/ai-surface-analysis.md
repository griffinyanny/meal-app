# AI Interaction Surface Analysis — Plan Screen

> **Status**: CONVERGED DIRECTION — Session 8 (2026-05-26). Original draft from Session 7 preserved below for historical context; converged model follows "Griffin's Feedback" section.
> **Created**: 2026-05-25 (Session 7)
> **Context**: Griffin flagged that the persistent AI chat bar / sparkle button pattern is overplayed. We explored alternative paradigms for how AI shows up in the product. This document captures the analysis and proposed direction. A ChatGPT deep research prompt was sent to gather industry examples and validation (see `chatgpt-research-prompt.md`).

---

## The Problem

Our interaction model says "AI generates the UI" — the entire screen IS AI output. But putting a chat bar at the bottom says "the AI lives *here*, in this bar." That contradicts the model. It tells users the AI is a feature bolted onto the screen, not the intelligence generating everything they see.

Every app in 2026 has the sparkle-icon-chat-bar. Users are developing literal blindness to it. It's become the new hamburger menu — present everywhere, used rarely, ignored by most.

**Core question**: If the AI is the whole screen, how does the user *modify* what they see without a traditional input surface?

---

## Five Paradigms Evaluated

### 1. Direct Manipulation (swipe/tap/drag on cards)

Every card responds to gestures. Swipe left = "show me another" (card peels away, new suggestion slides in). Swipe right = confirm/lock. Drag to reorder days. Long-press for contextual options.

- **Solves button blindness?** Yes — there is no button. Content responds.
- **Aligns with "AI generates the UI"?** Perfectly. The AI's output is what you manipulate.
- **Learnable?** Medium. Gesture-based interactions have a discoverability problem. First-time users won't know they can swipe without hints.
- **Scales to other tabs?** Well. Recipes: swipe to save/dismiss. Groceries: swipe to check off. You: swipe through preferences.
- **Biggest risk:** Discoverability. Can't handle complex cross-card requests ("I want to grill all weekend").

### 2. Inline Contextual Intelligence (each card is its own smart object)

No global input bar. Each card has its own interactive elements. The "why" rationale line is tappable. Tap it → a scoped input appears ON that card. Suggestion pills are per-card, not global.

- **Solves button blindness?** Yes — intelligence is woven into content.
- **Aligns with "AI generates the UI"?** Strongly. The AI's reasoning IS the interaction affordance.
- **Learnable?** High. Tappable text is a known pattern (Crouton's smart text is our #1 reference).
- **Scales to other tabs?** Somewhat. Works for Recipes (tappable ingredients). Less natural for Groceries (task-completion surface).
- **Biggest risk:** Can't handle cross-card or whole-plan modifications. Chattiness if too many affordances per card.

### 3. Progressive Simplicity (binary reactions)

Week 1: each card shows two icons. ✓ (keep) and → (next option). That's it. No typing, no menus, no chat. Over time, even these disappear — the plan just appears and you confirm with one tap.

- **Solves button blindness?** Yes. Two simple icons are content, not a "feature."
- **Aligns with "AI generates the UI"?** Beautifully. Chef presents draft, you nod or say "try again."
- **Learnable?** Extremely. Zero cognitive load.
- **Scales to other tabs?** Partially. Keep/replace works for Plan/Recipes. Doesn't fit Groceries well.
- **Biggest risk:** Feels too constrained for users who KNOW what they want. Needs an escape hatch for nuance.

### 4. Voice-First Ambient (hold anywhere to speak)

No text input anywhere. Screen is pure output. Hold thumb anywhere → speak → release → screen updates.

- **Solves button blindness?** Completely. No button exists.
- **Aligns with "AI generates the UI"?** Perfectly. Screen = output, voice = input.
- **Learnable?** Low initially. No signifier.
- **Scales to other tabs?** Beautifully. Voice works everywhere.
- **Biggest risk:** Context-dependent failure. Commuters, shared spaces, sleeping partners. Voice-only is a non-starter for many real contexts. Not viable as sole paradigm on web V1.

### 5. Hidden Input, Summoned by Gesture

No persistent input bar. A text/voice input surface is HIDDEN until summoned by a deliberate gesture. Appears when you need it, disappears when done.

- **Solves button blindness?** Yes. Removes visual noise.
- **Aligns with "AI generates the UI"?** Yes. Screen stays pure content.
- **Learnable?** Low without education. "Hidden" means "undiscoverable."
- **Biggest risk:** Needs careful first-use education. May be too radical on its own.

---

## Proposed Direction: "Content IS the Conversation" (Layered Model)

No single paradigm works alone. The recommendation is a layered system with clear dominance hierarchy:

### Layer 1 — Primary (80% of interactions): Direct manipulation on cards

Every meal card responds to:
- **Tap** → card expands inline (or bottom sheet rises) showing recipe preview, "Start cooking," details
- **Swipe left** → card peels away, new AI suggestion slides in with new rationale. Swipe again for another. This IS the "AI generates the UI" moment — each swipe is a new generation.
- **Swipe right** (or do nothing) → card confirmed/locked. Subtle lock icon.

The "Looks good" CTA on the hero card confirms the ENTIRE week with one tap. That's the Week-12 interaction: open, glance, tap, done.

### Layer 2 — Secondary (15% of interactions): Tap the rationale to respond

**The novel idea.** Each card shows a one-line AI rationale:

> "Fresh fish — best right after Sunday shopping"

That rationale line is interactive. Tap it → transforms into a contextual text input pre-filled with the AI's reasoning. User types OVER it with their intent:

> ~~Fresh fish — best right after Sunday shopping~~ → **"Something I can grill outside"**

Hit return → card updates. New recipe slides in. New rationale appears.

**Why this is powerful:**
- The AI's reasoning IS the input affordance. User responds to the chef's thinking.
- Totally invisible until tapped. Looks like content.
- Scoped to context — always modifying one specific thing.
- Progressive disclosure — users who never tap still have a great swipe experience.
- Teaches users what the AI considered, building trust while inviting redirection.

### Layer 3 — Escape hatch (5% of interactions): Hero card as global input

The hero card ("Your week, ready to review") has its own rationale line:

> "Built around your busy Thursday and a grocery run Sunday"

Tap THIS rationale → general input for whole-plan modifications: "I want to grill all weekend," "Add a dinner party Saturday," "Make everything lighter this week."

This handles cross-card requests. Still not a persistent bar — hidden inside the hero card until invoked.

### Voice as overlay (optional, not primary)

Subtle mic icon appears inside the expanded input when a rationale is tapped. Press-and-hold → speak → release. Convenience, not the primary paradigm.

---

## How This Scales to Other Tabs

- **Recipes**: Each recipe card's meta line (cook time, difficulty) is tappable. "30 min" → tap → "Make it 15 min" → AI simplifies. Swipe through recipe suggestions.
- **Groceries**: Each item has a context line ("from Monday's salmon recipe"). Tap → "swap for something cheaper" or "I already have this." Swipe to check off.
- **You**: Each preference card shows what the AI remembers. Tap the text → correct it. "Prefers chicken" → tap → "Bored of chicken lately."

---

## What This Eliminates vs. Preserves

**Eliminates:**
- Persistent AI chat bar
- Sparkle / AI button
- Global suggestion pills floating in space
- "Talk to AI" as a separate mode
- Any UI element that screams "THIS IS AN AI APP"

**Preserves:**
- Natural language input (invoked by tapping rationale, not in a permanent bar)
- Voice dictation (available when input is active)
- "AI generates the UI" model (purer than before — no separate AI chrome)
- Learnability (tap and swipe are universal)
- The 10-second Week-12 experience (open → "Looks good" → done)

---

## Risk and Mitigation

**Primary risk:** First-time users land on the screen and don't realize things are interactive.

**Mitigation:**
1. First launch: gentle animation showing one card peeking left (implying swipability)
2. Rationale text styled slightly differently (accent-colored or subtle "→") on first few uses
3. Hero card's "Looks good" CTA always visible — minimum viable interaction is obvious
4. If user does nothing for 10+ seconds on first visit, subtle prompt on one card: "Swipe for alternatives" — fades permanently

---

## Griffin's Feedback on This Direction

- Likes the overall direction of using content as the interaction surface
- Thinks removing ALL text input may be slightly too radical — wants SOME visible text input affordance
- Likes the "tap the rationale to respond" concept
- Wants to validate against industry research before committing
- Sent a ChatGPT deep research prompt to gather examples of innovative AI-native UIs (see `chatgpt-research-prompt.md`)

---

## Converged Direction — Session 8 (2026-05-26)

After reviewing the original draft direction, Griffin's feedback, and further discussion, the model was refined into the following converged direction. The original "Content IS the Conversation" proposal above remains valid as historical context — this section captures where it landed.

### The Revised "Content IS the Conversation" Model

**The plan IS the primary UI (70% of interactions).** Cards with rationale lines, swap chips, direct manipulation — swipe left for another suggestion, swipe right to confirm, tap to expand. This handles reviewing, tweaking, and confirming the AI's proposal.

**"Talk to the Chef" is a first-class input surface (20% of interactions).** Visible on the hero card as the secondary CTA (replaces the vague "Make changes"). For expressing intent in natural language — whole-plan direction, complex constraints, creative requests, or "start over." Opens a text field with voice activation and rotating suggestion pills ("Try: 'Plan a dinner party for Saturday'" / "'I want to grill all weekend'" / "'Use up the chicken in my fridge'"). Produces the same card-based output. The naming is a working label — may be too on-the-nose for final product, but the concept is locked.

**Structured multi-turn for clarification (10% of interactions).** When the AI needs to narrow intent, it generates tappable option cards — not text questions. Example: "For 6 guests, I'm thinking:" with three tappable options (grilling spread / family-style pasta / mezze platter). Reduces cognitive load. Can go 2-3 rounds for complex requests without ever becoming a chat thread.

**The chef's voice runs through everything.** Three levels:
- **Plan-level:** Brief 1-2 sentence header summarizing the logic ("Built for your Saturday dinner party — 6 guests, grilling focus, baby-friendly sides"). Ephemeral transition moment when generating ("On it — building around your dinner party Saturday").
- **Card-level:** Rationale lines on each card explaining why that specific meal ("Fresh fish — best right after Sunday shopping").
- **Change-level:** When modifications are made, the header refreshes ("Swapped Thursday to grilling — moved the salmon to Wednesday for freshness"). Fades after acknowledgment.

**The screen adapts to state.** No plan ready → input surface leads ("What are you thinking this week?" with suggestion pills). Plan exists → plan leads with "Talk to the Chef" as secondary CTA. Balance shifts over time — Week 1 is more input-led, Week 12 is almost entirely plan-led.

**What's eliminated:** Sparkle FAB, persistent chat bar, generic AI button, floating copilot, vague "Make changes" CTA.

**What's preserved:** Free-form natural language input (via "Talk to the Chef"), voice dictation, AI personality/acknowledgment woven through the UI, multi-turn clarification (through structured options, not chat).

### The "Familiar Containers, Alien Intelligence" Principle

The primary interaction patterns (cards, swipe, tap, chips) are deliberately familiar. The differentiation is what happens INSIDE those containers:
- Each swipe generates a new meal that didn't exist before (not catalog selection)
- Transformation chips are AI-generated per situation, not static menus
- Cross-meal ingredient economy is optimized across the week
- The AI's reasoning is visible and interactive (rationale lines)
- Recipes can be live-rewritten mid-cook

### Key Tension Resolved

Free-form input is a first-class citizen, not a fallback. The concern was that removing the chat bar would lose the ability to express complex, multi-dimensional intent ("4 recipes, grill 3, baby-friendly, 3 proteins"). Resolution: "Talk to the Chef" gives this capability a permanent, visible, labeled home on the hero card. It's not a chat bar — it's a named action with a specific location. The AI's output is always structured cards, regardless of whether the input was a swipe, a chip tap, or a dictated paragraph.

### Open Design Questions Remaining

1. Final naming — "Talk to the Chef" is working label, may be too literal for production
2. Exact placement and visual treatment of the "Talk to the Chef" affordance on the hero card
3. First-time discoverability of swipe gestures
4. How the structured multi-turn option cards look and animate
5. Transition animations between states (no plan → plan generated, card swap, etc.)

---

## Open Questions for Next Session

### Resolved in Session 8
1. ~~Does the "tap rationale to respond" pattern have precedent in any shipped product?~~ — Retained as part of the card-level interaction. Precedent less important now that the overall model is converged.
2. ~~What's the right "middle ground" between no text input and a persistent chat bar?~~ — **Resolved.** "Talk to the Chef" as a named, visible CTA on the hero card. Not a persistent bar, not hidden — a first-class labeled action.
3. ~~How does this interact with the first-time experience when the AI has no history?~~ — **Resolved.** Screen adapts to state: no plan → input surface leads with suggestion pills and "Talk to the Chef" prominent. Structured multi-turn option cards handle clarification without chat.

### Still Open
4. Can we prototype this in Figma Make to feel the interactions, or do we need a coded prototype?
5. Final naming for "Talk to the Chef" — working label locked, production name TBD
6. Exact placement and visual treatment of the "Talk to the Chef" affordance on the hero card
7. First-time discoverability of swipe gestures (onboarding animation specifics)
8. Visual design of structured multi-turn option cards and their animation
9. Transition animations between states (no plan → plan generated, card swap, etc.)
