# How AI Should Show Up in a Consumer Product

> Generalized synthesis from 8 discovery sessions, commissioned deep research across 12+ shipped AI products (Apple, Google, Adobe, Canva, Instacart, Samsung Food, Jow, Spotify, Granola, Superhuman, Arc Search, Crouton), and iterative design work on AI interaction models (2026).

---

## The Core Thesis

**The market is shifting from prompt-first to task-first AI interfaces.** The strongest AI experiences in 2025-2026 don't ask users to describe what they want from a blank text box. They present structured, personalized proposals and let users react, modify, and confirm. AI is attached to the object the user is already looking at — not living in a separate chat pane.

This was validated across Apple (Writing Tools, Clean Up, Visual Intelligence), Google (Circle to Search, AI Mode generative UI), Adobe (Generative Fill), Instacart (Smart Shop), Spotify (DJ), Samsung Food, Jow, Granola, Superhuman, Canva, and Arc Search.

---

## The Four Interaction Paradigms That Work

The research identified four distinct paradigms that are displacing the chat bar:

1. **Contextual Transformation** — AI acts on a selected object (a text block, a photo region, a card, a listing). The user points at something; the AI transforms it. Apple Writing Tools is the purest example: select text → rewrite/summarize/proofread appears inline.

2. **Gesture-Based Invocation** — Users circle, tap, brush, or screenshot what they mean instead of translating intent into prose. Google's Circle to Search (300M+ devices) is the flagship. The gesture IS the prompt.

3. **Generated Destination Screens** — AI returns a custom page, tool, or interactive layout — not a paragraph of text. Google's generative UI research found these custom interfaces were strongly preferred over standard markdown responses. Arc Search's "Browse for Me" creates a custom webpage as the answer.

4. **Ambient/Recommendation-Led Flows** — AI works in the background and surfaces drafts, summaries, carousels, or recommendations at the moment of need. Instacart's Smart Shop personalizes the shopping surface through learned preferences, health tags, dynamic filters, and tailored carousels — no chat required.

---

## The Design Philosophy: "Familiar Containers, Alien Intelligence"

This was the central principle we converged on. The interaction patterns should be **deliberately familiar** — cards, swipe, tap, chips, bottom sheets. Users don't need to learn a new interaction model. The differentiation comes from what happens **inside** those containers:

- Each interaction produces a genuinely new, personalized result (not a catalog lookup)
- Contextual options are AI-generated per situation (not static menus)
- The system's reasoning is visible and interactive
- Cross-item intelligence optimizes across the full context (not item-by-item)

**Don't reinvent the container. Fill familiar containers with capabilities that couldn't exist before AI.**

The risk of over-innovating on the interaction model itself is that users need training before they can use it. The risk of under-innovating is you build "just a better [existing product]." The sweet spot is familiar mechanics producing genuinely new outcomes.

---

## The Layered Interaction Model: "Content IS the Conversation"

We converged on a three-layer model for how users interact with AI, with a clear dominance hierarchy:

**Layer 1 — Primary (~70% of interactions): Direct manipulation on AI-generated content.**
Cards, tiles, or structured objects that respond to gestures. Swipe for alternatives, tap to expand, chip-select to modify. The AI's output IS the interface — every interaction with it is simultaneously using the product and providing feedback to the AI. This is the mature experience: open the app, glance, confirm, done.

**Layer 2 — Secondary (~20%): Named, visible free-form input.**
A clearly labeled, always-discoverable text/voice input surface for expressing complex, multi-dimensional intent. This is NOT a generic chat bar or sparkle button — it's a named action tied to the product's metaphor. It exists because some requests are genuinely faster to dictate than to express through card manipulation ("4 items, 3 specific constraints, a theme, and an exception"). The output is the same structured cards — the input method is different, not the output format.

**Layer 3 — Tertiary (~10%): Structured multi-turn clarification.**
When the AI needs to narrow intent, it generates tappable option cards — not text questions. "I'm thinking:" followed by 3 visual options to tap. Reduces cognitive load. Can go 2-3 rounds without ever becoming a chat thread. The AI does the cognitive work of narrowing; the user just picks.

**Critical insight: These layers aren't competing. They're different entry points to the same structured output.** Whether the user swiped, tapped a chip, or dictated a paragraph, the AI always returns inspectable structured content (cards, boards, lists) — never prose responses.

---

## The AI's Voice: Woven Through, Not Separate

The AI's personality and intelligence should run through the product's existing UI — not live in a separate conversation thread:

- **System-level:** Brief 1-2 sentence headers summarizing the logic behind what's shown ("Built around your busy Thursday and a grocery run Sunday")
- **Object-level:** Rationale lines on individual items explaining why THIS specific thing ("Fresh fish — best right after Sunday shopping")
- **Change-level:** When modifications happen, a brief acknowledgment of what changed and why, then fades

This is one of the genuinely valuable traits of conversational AI (acknowledgment, personality, reasoning transparency) — preserved without the chat interface. The system explains itself through its output, not through a separate conversation.

---

## What to Eliminate vs. Preserve from Conversational AI

**Eliminate:**
- Persistent AI chat bars / floating copilots
- Generic sparkle icons / "AI" buttons (Google's own research found nearly 100 sparkle variants across their products by 2024 — ubiquity killed specificity)
- "Talk to AI" as a separate mode or tab
- Spinner-based loading for agentic operations (users need process visibility, not waiting indicators)
- Blank prompt boxes that push cognitive load back to the user

**Preserve:**
- Natural language input (invoked deliberately, not persistent)
- Voice dictation as a first-class input method
- AI personality and acknowledgment woven into the UI
- Multi-turn intelligence (through structured options, not chat)
- The ability to express complex, multi-constraint intent quickly

---

## Anti-Patterns Confirmed by Research

1. **The "textbox with a sparkle icon"** — Pushes cognitive load back to the user. Forces them to articulate intent from scratch rather than reacting to a proposal.

2. **Persistent floating copilots without clear confirmations** — Users lose trust when AI takes actions silently. Every AI action needs inspection, provenance, and reversibility.

3. **Spinner-based loading for agentic operations** — When the system is doing multi-step work, show intermediate stages ("checking inventory → pricing alternatives → optimizing for constraints") not a generic spinner.

4. **Generic AI chrome everywhere** — The more places you put "AI" badges, the less any of them mean. Specificity beats ubiquity.

5. **AI as a bolt-on rather than the core** — If you have an AI tab or AI mode, you're saying the rest of the product ISN'T intelligent. The whole product should be intelligent; there shouldn't be a boundary between "the AI part" and "the regular part."

---

## The System Gets Faster Over Time (Not the Same)

A critical distinction from chat-based AI: the interaction model should **compress over time**, not stay flat.

- **Week 1:** System doesn't know the user. More questions, more structured onboarding, more suggestion pills. The AI interview model (conversational onboarding) captures immensely more data than static forms while having higher conversion rates.
- **Week 12:** System knows the user so well it presents a near-ready proposal. User confirms with one tap. The 10-second interaction.

Chat stays the same speed no matter how long you've used it. A task-first AI interface gets faster because it's learning — proposals get more accurate, confirmations replace explorations, the system becomes more opinionated (but always overridable).

---

## How to Think About AI Input Surfaces

Free-form input must be **first-class, not a fallback.** Research and testing showed that dictating a complex, multi-constraint request takes 30 seconds vs. potentially many card interactions. This isn't a power-user edge case — real-world scenarios regularly involve multiple simultaneous constraints.

But the input surface should be:
- **Named and intentional**, not generic (a branded action vs. a sparkle button)
- **Visible and discoverable**, not hidden behind layers
- **Contextual to the screen**, not the same bar everywhere
- **Producing structured output**, not chat responses

The AI should acknowledge and explain when it receives complex input — "Built for your Saturday dinner party — 6 guests, grilling focus, baby-friendly sides." This acknowledgment is one of the genuinely valuable traits of ChatGPT/Claude and shouldn't be discarded — but it should be brief and woven into the UI (headers, rationale lines), not a separate chat response.

---

## Feedback and Learning: The Personal Service Mental Model

The interaction should feel like working with a knowledgeable person who remembers you — not like a system collecting data.

- **Primary:** Implicit signals from behavior (what they accept, skip, modify, repeat, dismiss, manually override). The system being opinionated and proposing things IS the feedback mechanism — every reaction to a proposal is data.
- **Secondary:** Lightweight explicit check-ins where the value is clear to the USER (not the system). Quick reactions, not surveys.
- **Framing matters:** "Your [role] checking in" not "Rate your experience." The user should feel like they're talking to someone who cares, not filling out a form.

Purely explicit feedback → engagement drops, feels like homework. Purely implicit → misses nuance, can't capture "why." The balance is implicit as the foundation, explicit as the accelerator where it feels natural.

---

## The Research-Validated Interaction Pattern for Any Structured Domain

This generalizes to any domain where the user's context is somewhat known and the task has structure:

| Stage | Best Pattern | Why It Works |
|---|---|---|
| Setup | Structured onboarding with chips/toggles | Constraints are known in advance; avoids prompt-writing burden |
| Proposal generation | AI-generated cards on a board/calendar/list | Users compare at a glance and manipulate visually |
| Refinement | Contextual chips per card | "Cheaper / faster / different constraint" is easier than freeform |
| Conversion to action | One-tap with confirmation UI | Preserves trust, makes impact visible before commitment |
| Discovery/browsing | Personalized carousels, filters, inspiration | Supports serendipity without losing structure |
| In-context use | Adjustment controls on the object itself | Users need modifications where they're working |
| Feedback loop | Lightweight post-use reactions | Trains future proposals without requiring explicit prompts |

---

## Success Metrics for Post-Chat AI

The right KPIs aren't model metrics — they're **workflow metrics:**

- Proposal acceptance rate (how often users confirm without major changes)
- Time-to-completion (getting shorter over time = system is learning)
- Fallback-to-chat rate (lower = the structured UI is handling more)
- Swap/modification rate per item (some modification is healthy; too much means proposals are off)
- Action conversion rate (proposals → actual completed tasks)
- Repeat usage cadence
- Proportion of sessions needing zero free-form text input

The point isn't "more AI conversations." It's **less work to get the job done.**

---

## Sources and Validation

This synthesis draws from:
- **Competitive deep-dives:** NYT Cooking, Cooklist, Samsung Food (6M+ users, 4.8 App Store), Jow (7M users, 4.7 App Store), Mela, Crouton, Flighty, Function Health, Robinhood
- **Commissioned deep research (ChatGPT):** AI-native UI paradigms across Apple, Google, Adobe, Canva, Instacart, Spotify, Granola, Superhuman, Arc Search — covering official documentation, design research (NN/g, Apple HIG, Google Design), academic papers, and X/Reddit discourse
- **Design principles validated against:** Apple Writing Tools, Google Circle to Search (300M+ devices), Google AI Mode generative UI studies (generated interfaces preferred over markdown), Instacart Smart Shop (14 manual preferences, 30 health tags, ~500k products), Spotify DJ (94M Premium users)
- **8 iterative discovery sessions** refining interaction model, design direction, feedback systems, and AI surface decisions
