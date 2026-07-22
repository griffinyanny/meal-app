# Open Questions - Meal Management App

Unresolved questions that need discussion or decision. Remove items as they get resolved (and add the decision to `decisions.md`).

---

## Needs Griffin's call

### Ingredient-cache scoping — global vs household (BUG-004 #3, deferred to Phase E)
**Question**: The follow-up ingredient cache (#3) is most valuable **global** (an onion normalizes the same for every
household; item strings carry no PII), but a global table violates our drizzle-schema rule that every table has a
`household_id` + RLS. So: household-scoped (rule-clean, lower hit-rate) or genuinely global (best hit-rate, needs a
documented public-read / service-role-write exception)?
- Not urgent — #3 is a compounding follow-up, not part of the S29 latency fix. Decide when we pick up #3.
- Flagged now so it isn't decided silently inside a build session. Resolve → decisions.md.

### D7 — background scroll behind an open sheet (Session 17 E2E finding)
**Question**: The harness proved the background DOES scroll while a bottom sheet is open — the Session 16 note that the scrim blocks it was wrong (`modal={false}+noBodyStyles`, the fix for the D3 pointer-lockup, means nothing stops window scroll). Accept it as the trade for click-outside, or re-lock it?
- Option A: accept (scrolling background behind a non-modal sheet is common and harmless).
- Option B: re-lock via a scrim `onWheel`/`onTouchMove` `preventDefault` — safe, does NOT reintroduce the D3 body-pointer-events lockup.
- The D7 spec is `test.fixme`, ready to verify whichever way you go. Resolve → move to decisions.md.

---

## Product / UX

### AI Interaction Model (High Priority — blocks V1 UI design)
**Question**: When a user triggers an AI action (e.g., clicks "Edit" on a recipe), what happens?
- Option A: Opens a contextual chat thread ("What do you want to change?")
- Option B: Opens a structured wizard/form
- Option C: Hybrid — simple edits get inline controls, complex modifications open a chat
- Sub-question: Should there be a general-purpose AI chat accessible from anywhere (like Function Health's AI tab)?
- Sub-question: If a contextual AI suggestion is shown and user clicks it, does that open a chat?
**Status**: DIRECTION DECIDED (Session 3, 2026-03-30). "AI generates the UI" — dynamic personalized proposals, not chat-first and not static. User reacts/tweaks/confirms. Chat-first was debated and rejected (speed concerns, repeat-use tedium). Specific screen-level designs still need prototyping in Figma.
**Raised**: Session 1 (2026-03-28), deepened Session 2 (2026-03-29), direction set Session 3 (2026-03-30)

### AI Interaction Surface Paradigm
**Question**: How does AI show up across all screens? What replaces the persistent chat bar / sparkle button?
**Status**: RESOLVED (Session 8, 2026-05-26). **"Content IS the Conversation"** — layered interaction model:
- Primary (70%): Direct manipulation on AI-generated cards (swipe, tap, chips)
- Secondary (20%): "Talk to the Chef" — named, visible free-form input on hero card
- Tertiary (10%): Structured multi-turn clarification through tappable option cards
- Chef's voice woven through UI at three levels (plan, card, change)
- Screen adapts to state (no plan → input-led; plan exists → plan-led)
- Validated by ChatGPT deep research on AI-native UI paradigms + 6 Figma Make prototypes
- "Talk to the Chef" is a working label — final naming TBD
**Raised**: Session 7 (2026-05-25), resolved Session 8 (2026-05-26)

### Card Tap Interaction Model
**Question**: When you tap a meal card on the Plan screen, what happens? Does it open the recipe, or does it open an AI interaction surface?
**Status**: RESOLVED (Session 8, 2026-05-26). **Both — expanded card bottom sheet combines recipe preview + AI-generated contextual actions.** Tapping a card opens a glass bottom sheet (~70% of screen) showing: recipe hero image, title, rationale, meta, ingredient pills, PLUS AI-generated contextual action chips specific to that card. Actions differ per meal (e.g., "Start cooking" only appears for tonight's meal; "I didn't cook Monday's chicken" only appears if that's relevant). Escape hatch: "Something else? Tell your chef" opens Talk to the Chef scoped to that card.
**Raised**: Session 8 (2026-05-26)

### Information Architecture (High Priority — blocks screen-level design)
**Question**: What is the overall app structure? What are the primary tabs/sections? Is there a home page, and if so what does it show? How do Recipe Library, Meal Planning, Grocery List, and Preferences/Memory relate to each other in navigation?
**Status**: RESOLVED (Session 6, 2026-04-12). **Plan | Recipes | Groceries | You.** Four tabs, four nouns. Plan is the landing screen. No Home tab (junk-drawer risk). AI input bar is contextual per screen, general on Plan. Pantry (V1.5) lives inside Groceries. Cook mode is an overlay from recipe detail. Stress-tested against all V1–V4 features + unphased ideas — nothing requires a 5th tab. See `decisions.md` for full rationale.
**Raised**: Session 4 (2026-03-30)

### Memory System Architecture
**Question**: How do we build the persistent memory/context system? This is product-defining — the AI needs to track preferences, brand choices, recipe opinions, indirect signals ("I didn't like that") across sessions. Needs both an AI-readable store and a user-facing audit view. How much of this is LLM conversation history vs. structured database fields vs. a vector store?
**Status**: Open. Identified as critical in Session 2 but no architecture decision yet.
**Raised**: Session 2 (2026-03-29)

### App Name / Branding
**Question**: What should the app be called?
**Status**: Deferred. Using "meal-app" as working name.
**Raised**: Session 1 (2026-03-28)

### Free-Form vs. Structured List Entry
**Question**: How do users add items to the grocery list? A structured catalog (pick from ingredients) helps with normalization, merging, and nutrition data — but adds friction vs. just typing "milk." Free-text entry is fast but harder to normalize. A dual mode feels like odd CX. What's the right solve?
**Status**: RESOLVED (Session 22, 2026-07-20). **Free-form + AI tidy.** Type anything → optimistic insert → background AI categorize/dedupe. No structured catalog picker (that's the V1.5+/Instacart-era evolution; 1D builds only the canonical `name` vs `rawName` seam). Confirmed by the imported Groceries design. See `decisions.md` (2026-07-20) + `scope-1D.md`.
**Raised**: Session 2 (2026-03-29)

### AI-First Preferences vs. Static Settings UI
**Question**: Should preferences (dietary rules, brand preferences, store layout, etc.) be managed primarily through AI conversation ("I don't eat gluten anymore") rather than traditional settings screens? Griffin's instinct is yes — people want to say a thing and have it happen. But this requires training users on what's possible, and some people will want to see/verify their preferences in a structured view.
**Status**: RESOLVED (Session 32, 2026-07-22). **Hybrid — AI-first capture, structured audit, split by data type.** Capture is conversational (onboarding interview / Talk-to-Chef / implicit thumbs); the You tab is the trust/audit surface, not the primary editor. Hard constraints (dietary, allergies, household size, cook-times, cuisines) are AI-set but **always directly editable** (safety-critical); soft memory is an AI-captured, correctable ledger. Infra already reflects it (`user_preferences` + `ai_memories`). See decisions.md (S32) + `scope-1E.md` (the framing decision).
**Raised**: Session 2 (2026-03-29)

### Avoiding the Linear Golden Path Trap
**Question**: How do we make meal planning flexible and non-linear? Users should be able to enter the flow at any point, iterate, and not feel locked into a rigid step-by-step process. Long wizard-style flows are probably worse than open-ended flexible ones. But some structure helps new users. How do we balance?
**Status**: Open. Critical UX question for V1.
**Raised**: Session 2 (2026-03-29)

### Recipe Discovery Model (New — raised by Cooklist walkthrough)
**Question**: Do we need a built-in recipe catalog/browse experience, or do we lean into AI-generated recipes + external import (URL, photo, social) and let users do "discovery" elsewhere? Cooklist has an infinite scroll catalog. Griffin's instinct: "Do people want to browse 100 steak recipes, or do they want recommendations based on what they're feeling?" If someone is already looking at a steak recipe, do they want more steak recipes or something complementary? This has huge implications for what we build and how we differentiate.
**Status**: Open. Fundamental product question. Needs market signal — is browse/discover a retention driver, or is it table stakes that AI can replace?
**Raised**: Session 5 (2026-04-05)

### Pantry in IA: Dedicated Tab vs. Embedded Capability
**Question**: Cooklist dedicates an entire tab to Pantry. Is a dedicated pantry section necessary, or should pantry be an invisible background capability?
**Status**: RESOLVED (Session 6, 2026-04-12). Pantry lives as a section/toggle within Groceries tab. "What I have" is the flip side of "what I need to buy" — same data, different views. No dedicated tab. Pantry data informs AI planning (auto-subtraction from lists) without requiring user management. See IA decision in `decisions.md`.
**Raised**: Session 5 (2026-04-05)

### Retailer Account Linking: Setup vs. Checkout
**Question**: Should users link their grocery store accounts (Target, Kroger, etc.) during initial onboarding/profile setup or at the point of checkout? Cooklist does it at checkout (web view login with email code), which is very clunky. Pre-linking in profile/settings would make checkout frictionless but adds to onboarding weight. What's the right balance? Could we do progressive linking — first checkout triggers the link, then it's remembered?
**Status**: Open. V2 concern but worth thinking about architecturally.
**Raised**: Session 5 (2026-04-05)

### Platform Sequencing: Web-First vs. iOS-First (New — raised Session 5)
**Question**: Griffin's design direction is deeply iOS-native (liquid glass, glass-morphism, Crouton/Flighty aesthetic). The current plan is web-first (phone form factor) → iOS later. But if the target aesthetic is fundamentally iOS-native, can a web app deliver an acceptable experience, or should we go straight to iOS?
**Status**: RESOLVED (Session 5, 2026-04-05). **Web-first confirmed.** Griffin is comfortable with Crouton/Flighty-inspired design *patterns* (dark mode, clean typography, limited palette, smart inline features) without needing to nail liquid glass polish on web. Native-level visual polish comes when we go iOS. Web app should look and feel like those apps conceptually, not pixel-perfectly. Added to `decisions.md`.
**Raised**: Session 5 (2026-04-05)

### Onboarding Flow
**Question**: What should the first 5 minutes look like? UX designer suggested: have user paste one recipe URL, watch AI extract it, show what a meal plan + grocery list looks like. Griffin mentioned "baby mode" with dynamic onboarding (combo chat + fixed UI).
**Status**: Needs design exploration.
**Raised**: Session 1 (2026-03-28)

### Monetization Details
**Question**: What features are free vs. paid? What's the pricing? Free trial length?
**Status**: Deferred to after V1 validates core loop.
**Raised**: Session 1 (2026-03-28)

## Technical

### PWA vs. React Native for Mobile
**Question**: Should V1-V2 web app be a PWA (add-to-home-screen, push notifications) to defer native app investment? Or commit to React Native earlier?
**Status**: Decision deferred. Build web app first, evaluate whether PWA covers 80% of native needs.
**Raised**: Session 1 (2026-03-28)

### Instacart Integration Feasibility
**Question**: What's the current state of Instacart's developer program / API? Is direct cart integration possible, or do we need deep-link/affiliate approach?
**Status**: RESEARCHED. Instacart requires business partnership (not self-serve). Kroger has the only real open API. Path: V1 no integration, V2 Kroger API + deep links, pursue Instacart partnership with traction. See `technical-research.md`.
**Raised**: Session 1 (2026-03-28)

### LLM Platform Selection
**Question**: Which LLM provider(s) to use for production? Current recommendation is tiered routing (GPT-4.1-mini for routine, Claude Sonnet for complex). Need to benchmark on actual recipe tasks before deciding.
**Status**: Research done. Decision deferred to prototyping phase. Will test on Gemini free tier first, then benchmark.
**Raised**: Session 1 (2026-03-28)

### Regenerate / "new plan" entry point (V1 blocker)
**Question**: Where does "plan a new week" live once a plan already exists? `NoPlanState` only shows when there's no plan, so today the plan dead-ends after week one. Related: should a new generation replace the current plan (backend already does this) or archive it for history? And how does an elapsed/all-past confirmed plan invite a fresh week instead of showing a nonsensical mid-week view?
**Status**: OPEN — surfaced in Session 15 (Test 8 couldn't run without it). Backend replace-on-generate is implemented; the gap is UI + interaction design. Deferred to a design-led build pass with ux-design-critic. Tracked in `idea-backlog.md` as a V1 blocker.
**Raised**: Session 15 (2026-07-06)
