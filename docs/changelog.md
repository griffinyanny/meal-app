# Changelog - Meal Management App

Session-by-session log of decisions, progress, and key discussions.

---

## Session 1 — 2026-03-28

### What happened
- Griffin shared full product vision and feature brain dump for a meal management app
- Reviewed two existing research documents in `/reference/`:
  - `Meal Management Cooking App Deep Research and Competitor Synthesis .md` — competitor analysis of 9+ apps (NYT Cooking, Paprika, AnyList, Samsung Food, Cooklist, Mealime, SideChef, Eat This Much, PlateJoy)
  - `grocery-notes-research.md` — academic/behavioral research on grocery shopping and meal planning
- Consulted UX designer on missing user problems, interaction model, form factors, and risks
- Consulted planning agent on phased roadmap and technical architecture
- Built the full phased roadmap (V1 through V4)
- Generated 10 additional feature ideas beyond Griffin's brain dump

### Decisions made
- **Primary user for V1**: Solo health-conscious adult (Griffin's profile)
- **Phasing confirmed**: V1 (core loop) -> V1.5 (pantry + sharing) -> V2 (ordering + photo import) -> V3 (health coaching) -> V4 (native mobile)
- **AI interaction baseline**: Contextual AI everywhere (inline, not a separate tab)
- **Working name**: "meal-app" (branding TBD)
- **Tech stack**: Next.js + tRPC + Supabase + Drizzle + shadcn/ui + Tailwind + Claude API + Vercel
- **Architecture**: API-first via tRPC (not Server Actions) to support future iOS/Android clients

### Open questions raised
- AI interaction model needs deeper exploration: when a user clicks "Edit" on a recipe, does it open a chat thread, a wizard, or something hybrid?
- Function Health-style dedicated AI tab vs. contextual-only — to be explored further with UX designer

### Key insights from research
- "10 minutes from no idea to grocery list" is the validated success criterion
- Grocery list is the biggest retention lever AND most fragile trust surface
- Pantry setup friction kills pantry-aware apps — must be progressive (binary have/don't have first)
- Cart integration failures are disproportionately damaging to trust — always maintain manual list as source of truth
- PlateJoy discontinued July 2025 — displaced user cohort is an opportunity

---

## Session 1 (continued) — 2026-03-28

### What happened
- Griffin asked for deep research on two critical technical questions:
  1. How good are LLMs at recipe generation/modification? Do we need RAG?
  2. Are grocery integrations open/accessible?
- Researched both topics thoroughly
- Created `docs/technical-research.md` with full findings

### Key findings: Recipe AI
- LLMs are genuinely strong at recipe tasks for everyday home cooking — no RAG needed for V1
- The system prompt is the secret sauce: encode dietary rules, safety guardrails, output format
- Baking is the one danger zone (wrong proportions). Savory cooking is forgiving.
- USDA FoodData Central API (free) covers nutrition data
- Hybrid URL parsing: `recipe-scrapers` library (~70% of sites) + Claude fallback = near 100% coverage
- Cost: ~$0.01-0.05 per recipe generation, ~$0.005-0.02 per URL parse

### Key findings: Grocery Integrations
- **Kroger** is the only major retailer with a genuinely open, self-serve cart API
- **Instacart** requires a business partnership — not accessible to small apps without traction
- **Walmart, Amazon Fresh** — no public APIs at all
- Deep links (pre-filled search URLs) are the no-partnership fallback
- Recommendation: V1 has no integration (just a great list), V2 adds Kroger API + deep links, pursue Instacart partnership when traction exists

### Discussions
- Griffin wants to think carefully about recipe AI credibility before pitching this as "expert recipe generation"
- Integration constraints inform phasing — V1 should not depend on grocery partnerships

### LLM cost analysis added
- Researched pricing across Anthropic, OpenAI, Google, open source, and smaller providers
- Recommendation: tiered model routing (cheap models for routine tasks, premium for complex)
- GPT-4.1-mini identified as likely production workhorse ($0.0015/recipe) — best structured output guarantees
- Claude better for complex dietary reasoning but 5-10x more expensive for routine tasks
- Gemini 2.5 Flash free tier recommended for prototyping (zero cost)
- Google for Startups offers up to $350K in credits — worth pursuing
- LLM costs are not the biggest expense: ~$150/mo at 100K requests. Hosting and database cost more.
- Decision deferred to prototyping — will benchmark quality across providers on actual recipe tasks

### Phase 0 redefined as Discovery & Design
Griffin clarified: no code should be written until we've done proper discovery work — competitive deep-dives, design exploration, wireframing in Figma, resolving open questions. What was "Phase 0: Foundation Sprint" is now "Phase 1: Infrastructure Sprint," and there's a new "Phase 0: Discovery & Design" that gates everything.

### Figma operating model researched and documented
- Figma Make: AI-powered prompt-to-prototype tool. Generates coded prototypes from text prompts. 3,000 credits/month on Pro.
- Figma MCP Server: bridges Claude Code and Figma. Claude Code can read designs and push content to canvases.
- Operating model: Claude Code drafts feature specs and Figma Make prompts, Griffin generates in Figma Make, reviews and iterates, Claude Code reads approved designs via MCP to inform implementation.
- Setup: `claude plugin install figma@claude-plugins-official`, authenticate, need Full seat on Figma Pro.
- Key limitation: no automatic sync — each direction requires manual initiation.

---

## Session 3 — 2026-03-30

### What happened
- Deep debate on core interaction model. Explored chat-first → pushed back on it (speed, repeat-use tedium) → landed on "AI generates the UI" model.
- Defined the "personal chef" metaphor as the core product personality.
- Resolved feedback collection approach: blended model (implicit behavioral signals as foundation + lightweight explicit check-ins framed as "personal chef checking in").
- Established V1 framing: the personal chef on their first day — asks questions, learns fast, gets smarter every week.
- Griffin requested: no sycophancy. Challenge ideas, pressure-test, debate first, then execute. Saved to memory.
- Updated master plan to reflect new interaction model across all phases (V1 features significantly revised).
- Set up session-handoff protocol: when Griffin says "resume meal app," read docs and give exact status.

### Decisions made
- **AI interaction model: "AI generates the UI"** — dynamic personalized proposals, not chat-first, not static. User reacts/tweaks/confirms.
- **Feedback model: blended implicit + explicit** — behavioral signals as foundation, lightweight check-ins as accelerator. "Personal chef checking in" framing.
- **V1 = personal chef on day one** — asks questions, makes good general suggestions based on limited knowledge, learns fast.
- **Working principle: no sycophancy** — Claude should challenge Griffin's ideas and pressure-test before agreeing.

### Key insight
The "AI generates the UI" model is the core differentiator. No competitor does this. Every meal planning app uses static UIs. This is harder to build but is the actual product bet.

---

### Master plan approved and Phase 0 launched (2026-03-29)
- Griffin approved the full master plan
- Phase 0: Discovery & Product Shaping is now active
- Household sharing (dual account ownership) moved from V1.5 into V1
- "Nail before expanding" added as core product principle
- UX agent template created at `docs/ux-agent-template.md`
- Discovery log created at `docs/discovery-log.md`
- Tooling decision: no new tools needed for Phase 0. Linear recommended at start of Phase 1.
- Griffin noted he may want to move to native app development sooner than planned — parked for now.

---

## Session 5 — 2026-04-05

### What happened
- Resumed Phase 0 competitive walkthroughs
- Deep walkthrough of **Cooklist** — Griffin's most extensive competitive analysis yet. Walked through the entire app end-to-end: login, pantry setup, AI meal plan generation (voice input), plan management, shopping list sync, retailer checkout (Target), recipe browsing, Cook tab, ingredient pages, profile/settings.
- Griffin took 22 screenshots saved to `reference/competitor-videos/Cooklist/`
- Key framing: "What I'm doing is building an AI-first Cooklist"

### Key observations
- **Design sophistication is a massive competitive opportunity** — Cooklist (and the broader competitive set) looks "cheesy," "amateurish," "clunky." Fonts, graphics, icons, celebration animations, logo — all feel childish. The bar is genuinely low. A clean, modern, sophisticated UI is a real differentiator, not just personal taste.
- **Voice-first input validated** — Cooklist's dictation-based plan creation ("tell me what you want to eat this week") is the closest thing in market to our interaction model. Right instinct, poor execution (no confirmation, no follow-up questions, no typing fallback).
- **Hard-coded plans are the old paradigm** — Each plan as a distinct artifact with its own settings is outdated. Our dynamic, continuous, system-aware approach is the right bet.
- **Forced pantry setup kills conversion** — Caused Griffin to literally bounce from the app on first use.
- **4-minute plan generation is unacceptable** — Speed is critical. Background processing with app-wide progress indicator needed.
- **Manual sync steps shouldn't exist** — Plan-to-shopping-list should be automatic.
- **Recipe discovery model is an open question** — Do we need a recipe catalog, or is AI-generated + external import sufficient?

### New open questions raised
- Recipe discovery: built-in catalog vs. AI-generated + import?
- Pantry as dedicated tab vs. background intelligence layer?
- Retailer account linking: setup time vs. checkout time?

### New ideas captured
- Ingredient reuse optimization in planning
- Multi-provider auth (Google SSO, OTP)
- "Scan your fridge" AI pantry import
- Ingredient detail pages (cross-referencing)
- In-app guided tours
- Pre-authenticated store accounts
- Grocery spend tracking
- App review prompt timing research
- Macro tracking as future extension
- Design sophistication as competitive moat

### Design Direction Deep-Dive (later in Session 5)
Griffin reviewed 6 apps for design inspiration, building from "least favorite" to "most favorite":

**Design references ranked:**
1. **Crouton** — #1 reference. "If you asked me to pick one app to emulate, Crouton." MVP visual baseline. Liquid glass, dark mode, brilliant cook mode (smart text with auto-detected timers, tappable ingredients). Take Crouton's design + add AI.
2. **Flighty** — Aspirational quality bar. iOS liquid glass, bottom card modality, "rich serious dense but airy and usable."
3. **Robinhood** — Geometric/diagrammy illustration style, bold limited-palette colors on black, 4-tab IA with depth.
4. **Mela** — One bold accent color + dark mode + whitespace = premium recipe app. Minimalism proof point.
5. **Function Health** — Interaction model reference (static UI → AI chat for creation). Structured objects inline in chat. Protocol builder progress steps.

**Key design principles locked:**
- Dark mode first (non-negotiable)
- iOS Liquid Glass / glass-morphism aesthetic
- Limited color palette (1-2 accent colors)
- Bold typography hierarchy with whitespace
- No cheesy graphics, emojis, or celebration animations
- Smart inline features (Crouton's tappable recipe text model)
- Bottom card/sheet modality for AI interaction

**Recipe discovery behavior confirmed:**
- Griffin does NOT browse recipe catalogs
- Uses ChatGPT for generation, NYT for specific search, wife shares from Instagram
- Validates Option C: AI-powered discovery that feels like browsing, not a static catalog
- Share-menu integration (iOS share target) is critical for Instagram recipe capture

**Ingredient reuse**: Soft optimization only. AI should consider it if ingredients won't be fully used in one recipe, but don't constrain meal variety.

**V1 scope confirmed**: Narrow scope validated. Cooklist's breadth makes Griffin feel more confident about focusing.

**Platform question raised**: If the design direction is fundamentally iOS-native (liquid glass), should we reconsider web-first? Open question with significant implications.

---

## Session 6 — 2026-04-12

### What happened
- Resolved information architecture — the last major blocker before screen-level design
- Deep analysis of IA options: Plan-Centric (A), Home Hub (B), Minimal 3-tab (C), Plan+List Merged (D)
- Stress-tested Option A against every feature in V1 through V4 plus all unphased ideas
- Griffin confirmed Option A after reviewing the analysis

### Decisions made
- **Information Architecture: Plan | Recipes | Groceries | You** — Four tabs, four nouns. Plan is the landing screen and the primary AI surface. No dedicated Home tab (junk-drawer risk). AI input bar contextual per screen, general on Plan. Pantry lives inside Groceries. Cook mode is an immersive overlay from recipe detail, not a tab. Stress-tested through V4 — no feature requires restructuring.

### Key insights
- "Home" tabs become catch-alls over time — every new feature wants real estate. Plan bounds scope clearly.
- Pantry is the flip side of Groceries ("what I have" vs. "what I need") — they belong together.
- AI discoverability solved by making Plan's input bar the general "ask your chef" surface, with rotating placeholder text and suggestion pills that show diverse query types.
- Cook mode is Crouton-style: an immersive overlay, not a navigation destination.

---

### Project management infrastructure built
Griffin requested formal systems to ensure long-running multi-phase build doesn't lose context. Created:
- `docs/idea-backlog.md` — Master backlog of ALL ideas with phase assignment, source, and status. Nothing gets deleted. New ideas go to "Incoming" immediately.
- `docs/plans/README.md` — Index of all plans at three levels: phase plans, feature plans, spike/research plans
- `docs/plans/` directory — For individual plan files as we go deeper
- Moved research docs into `meal-app/reference/` for explicit project context
- Updated `CLAUDE.md` with comprehensive session protocol:
  - Start-of-session context restoration
  - End-of-session updates across all tracking docs
  - Rules for capturing new ideas immediately during any session
  - Rules for noting architecture decisions that affect future phases
  - Rules for referencing research when making decisions
  - Plan hierarchy explanation (phase → feature → spike)

---

## Session 7 — 2026-05-24 to 2026-05-26

### What happened
- Resumed after 6-week gap. Kicked off design phase (Phase 0D).
- **Wrote `docs/design/Guidelines.md`** — the durable Figma Make bridge document. Consolidates design direction, IA, interaction model, component patterns, AI surface conventions, voice/personality, anti-patterns, and reference apps. Designed to be pasted into Make's Guidelines tab and reused across every generation session.
- **Wrote `docs/design/brief-plan.md`** — per-screen brief for the Plan tab. Specifies two states: State A (Sunday morning, fresh week proposal) and State B (Wednesday evening, mid-week). Includes specific sample meal content, interaction details, and generation guidance for Make.
- **Researched Figma Make best practices** — model selection (Sonnet 4.6 recommended for iteration, Opus for polish), attaching reference screenshots, credit management, hybrid workflow (Make → copy to Design → manual iteration → back to Make).
- **Griffin generated first Plan screen prototypes in Figma Make** — Sunday and Wednesday views. Figma file: `SvN6dPjWCxvc4qnaZfKNmc` ("meal-app-v1"). Griffin described them as "decent start, by no means complete."
- **Deep dive on AI interaction surface** — Griffin flagged that the persistent chat bar / sparkle button pattern is overplayed. Explored five alternative paradigms. Proposed "Content IS the Conversation" layered model (see `docs/design/ai-surface-analysis.md`).
- **Sent ChatGPT deep research prompt** — to gather industry examples of innovative AI-native UIs beyond chat bars (prompt saved at `docs/design/chatgpt-research-prompt.md`). Research pending.

### Key design files created
- `docs/design/Guidelines.md` — Figma Make bridge doc (durable, reused every session)
- `docs/design/brief-plan.md` — Plan screen generation brief
- `docs/design/ai-surface-analysis.md` — Five paradigms evaluated + proposed "Content IS the Conversation" direction
- `docs/design/chatgpt-research-prompt.md` — Deep research prompt for AI-native UI patterns

### Design direction proposed (NOT yet decided)
- **"Content IS the Conversation"** — a layered interaction model:
  - Layer 1 (80%): Direct manipulation on cards (swipe left = show another, swipe right = confirm, tap = expand)
  - Layer 2 (15%): Tap the AI's rationale line on a card → it transforms into a contextual input for that card
  - Layer 3 (5%): Hero card rationale → global input for whole-plan changes
  - Voice as optional overlay, not primary
- **Griffin's reaction**: Likes the direction. Thinks removing ALL text input may be slightly too radical — wants some visible affordance. Wants to validate against industry research before committing.
- **Status**: PENDING — awaiting ChatGPT deep research results on AI-native UI patterns

### Decisions made
- None confirmed this session. The AI surface paradigm is under exploration, not decided.

### Open questions raised
- Is removing the persistent input bar too radical? Where's the middle ground?
- Does "tap the rationale to respond" have precedent in shipped products?
- How does first-time experience work when the AI has no history and needs to ask more questions?

### Figma MCP status
- NOT connected this session. Griffin is reconnecting MCP for next session so Claude can read Figma designs directly.

---

## Session 8 — 2026-05-26

### What happened
- Integrated ChatGPT deep research on AI-native UI paradigms beyond chat bars (stored at `reference/ai-native-design-research.md`)
- Converged on the AI interaction surface paradigm: "Content IS the Conversation" — a layered model with direct manipulation as primary (70%), "Talk to the Chef" free-form input as secondary (20%), and structured multi-turn clarification through option cards as tertiary (10%)
- Debated the role of free-form input vs. cards/swipe — resolved that free-form is first-class, not a fallback, because complex multi-constraint requests are genuinely faster via dictation
- Defined "familiar containers, alien intelligence" as the core design differentiation principle
- Defined the chef's voice running through the UI at three levels: plan-level summary, card-level rationale, change-level acknowledgment
- Updated Guidelines.md to reflect converged AI surface model (killed persistent input bar, added Talk to the Chef, contextual chips, option cards, chef-voice headers)
- Wrote briefs for 6 Plan tab states and generated all 6 in Figma Make
- Connected Figma MCP — Claude can now read designs directly
- Reviewed all 6 Figma states via MCP. Key surprises to preserve: "YOUR CHEF" label, Saturday "SUGGESTED" card pattern, ingredient pills as chips, inline Talk to Chef input adapting to mid-week context
- Defined card tap interaction model: tap opens expanded bottom sheet with recipe preview + AI-generated contextual actions (not a static menu)
- Resolved the review workflow: sticky bottom confirm bar appears when hero scrolls out of view
- Discussed Figma Make workflow, design fidelity expectations, and transition to code
- Established development workflow preferences: build autonomously, periodic check-ins, Codex QA at milestones, self-directed refactoring thinking

### Decisions made
- **AI interaction surface paradigm: "Content IS the Conversation"** — Layered model. 70% direct manipulation on cards, 20% "Talk to the Chef" free-form input, 10% structured option cards. Chef's voice woven through UI. No sparkle FAB, no persistent chat bar. Full details in `decisions.md`.
- **Card tap behavior**: Opens expanded bottom sheet with recipe preview + AI-generated contextual actions. Actions are situation-specific, not a static menu.
- **Review workflow**: "Looks good" on hero card for confident users + sticky bottom confirm bar for users who scroll through the full plan.
- **Design completeness**: 6 Plan tab states are sufficient to begin build. Other tabs (Recipes, Groceries, You) will use the same component vocabulary.
- **Development workflow**: Claude builds autonomously, Griffin checks in periodically. Codex QA at milestones. Self-directed refactoring.

### Design files created/updated
- `docs/design/Guidelines.md` — Updated for converged AI surface model
- `docs/design/brief-plan-states.md` — 6 state briefs for Plan tab
- `docs/design/prompt-state1-refinement.md` — Follow-up prompt for State 1 refinement
- `docs/design/ai-surface-analysis.md` — Updated with converged direction
- Figma file: `SvN6dPjWCxvc4qnaZfKNmc` ("Meal-App-Designs") — 6 Plan tab states generated in Figma Make

### What's next
- Deep systems architecture review (web → iOS transition, AI/LLM integration, scalability)
- Create a Phase 1 implementation plan
- Begin Phase 1 build

---

## Session 9 — 2026-05-26

### What happened
- **Full systems architecture review** — designed the complete architecture for V1 through V4
- **Phase 1 implementation plan created** — 6 build phases (~9 weeks total): Foundation → AI Core + Recipes → Plan Tab → Groceries → You Tab + Memory → Polish
- **Independent system architect review** — validated architecture, identified 6 operational gaps (image handling, AI error states, rate limiting, testing, observability, memory timing), all incorporated
- **Security audit** — OWASP Top 10 assessment, AI-specific security (prompt injection, SSRF, data leakage), privacy/compliance (GDPR/CCPA). Full security requirements by phase.
- **Eventing strategy designed** — PostHog selected (deferred install to Production Readiness), event taxonomy defined (30+ events across 8 categories), vendor abstraction layer planned
- **LLM integration architecture documented** — "structured output tool, not an agent" model with 12 specific touchpoints mapped
- **Quality infrastructure created** (parallel session) — pre-commit hooks, file-type rules, slash commands, engineering principles doc
- **Phasing principle established** — invest in things that can't be retrofitted (data model, auth, security, abstraction layers) in Phase 1. Defer production tooling (PostHog, Sentry, E2E tests) to Production Readiness phase.

### Decisions made
- **Project structure**: Single Next.js app, not monorepo. Clean `src/server/` separation for future mobile extraction.
- **Household sharing**: Infrastructure only in V1 (household_id everywhere). Full sharing UI deferred to V1.5.
- **Cook mode**: Deferred to V1.5. Data model supports it.
- **Timeline**: Ship when ready. No external deadline. ~9 weeks estimated.
- **Auth**: Google SSO + magic link from day one.
- **Analytics**: PostHog (decided, installed later). Vendor abstraction layer built in Phase 1.
- **Error tracking**: Sentry (decided, installed later).
- **LLM integration model**: Structured output tool, not an agent. Deterministic code always in control.
- **Memory system**: Structured preferences table + unstructured AI memory log. No vector store in V1.
- **Real-time**: Deferred to V1.5 (no Supabase Realtime until sharing ships).

### Plans created
- `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` — Systems Architecture & Phase 1 Plan (approved)

---

## Session 10 — 2026-05-27

### What happened
- **Phase 1A: Foundation Sprint — COMPLETED in one session**
- **Environment setup**: Git repo initialized, GitHub remote created (private: griffinyanny/meal-app), Supabase CLI installed via npm, all env vars configured
- **Project scaffold**: Next.js 16 + TypeScript + Tailwind v4 + Turbopack + shadcn/ui + tRPC v11 + Drizzle ORM + Supabase Auth + Vitest
- **Full database schema**: 11 tables across 5 domain files (households, recipes, plans, grocery, memory). All tables have household_id, created_at, updated_at per project rules.
- **RLS policies**: Created `is_household_member()` helper function and RLS policies on all 11 tables
- **tRPC API layer**: 4 routers (recipe, plan, grocery, user) with `protectedProcedure` middleware enforcing auth + household membership. Added `authedProcedure` for pre-onboarding operations.
- **Auth flow**: Google SSO via Supabase Auth, proxy (middleware) for session refresh and route protection, auth callback with open redirect protection
- **Auto-onboarding**: `user.ensureOnboarded` mutation creates user + household + membership records on first login. Griffin successfully logged in and records created.
- **App shell**: Phone form factor (430px), glass-morphism tab bar with safe area insets, 4 tab pages with placeholder content
- **Dark mode glass design system**: Custom CSS tokens (#0E0E10 background, #3A86FF accent), glass-surface/glass-sheet/glass-card utilities, shadcn/ui initialized
- **Vendor abstraction layers**: analytics.track() (console.log) and errorReporting.capture() (console.error) — ready for PostHog/Sentry plug-in later
- **Vercel deployment**: Deployed to production (https://meal-app-swart.vercel.app), env vars configured for all environments
- **Multi-perspective code review** (`/review`): 4 parallel sub-reviews (correctness, security, architecture, performance). Found and fixed:
  - CRITICAL: 4 authorization bypass bugs in grocery/plan routers (mutations without household ownership checks)
  - CRITICAL: `mealPlanSlots` and `groceryItems` missing `household_id` column
  - IMPORTANT: Duplicated grocery category enum (extracted to shared constant)
  - IMPORTANT: Missing Zod schemas for JSONB columns
  - IMPORTANT: `updatePreferences` race condition (converted to upsert)
  - IMPORTANT: `dietaryFramework` accepting arbitrary strings instead of defined enum
  - IMPORTANT: Login error handling, open redirect, safe area insets, tap target sizes
  - IMPORTANT: `householdSize`/`maxCookTime` stored as text instead of integer
- **Supabase new keys**: Researched and confirmed new publishable/secret keys are drop-in replacements for legacy anon/service_role keys
- **Next.js 16 proxy convention**: Renamed middleware.ts → proxy.ts with named `proxy` export per Next.js 16 deprecation
- **Lazy DB initialization**: Fixed build failure caused by eager postgres driver initialization at module scope

### Decisions made
- **Supabase new keys (publishable/secret)**: Use new keys, not legacy. Drop-in compatible with @supabase/ssr.
- **Database connection**: Transaction pooler (not direct or session). Required for serverless (Vercel). `prepare: false` already set.
- **Auto-onboarding approach**: `user.ensureOnboarded` mutation called via `OnboardGuard` client component on app layout mount. Creates user + household + membership if not exists. Full AI-guided onboarding deferred to Phase 1E.
- **Next.js 16 proxy**: Use `proxy.ts` with named `proxy` export (replaces deprecated `middleware.ts`).

### Milestone M1: ACHIEVED
- Deployed app, login works, tabs navigate, glass design system visible, database records created on login

### What's next
- Phase 1B: AI Core + Recipes

---

## Session 11 — 2026-05-27

### What happened
- **Phase 1B: AI Core + Recipes — built and shipped to working state. Milestone M2 achieved.**
- **AI service layer**: Provider abstraction on Vercel AI SDK v6 (`generateStructured`/`generateText`/`generateStream`), per-task model config, retry with classification, metadata logging. Decided to use AI SDK over a custom abstraction (validated against system-architect reasoning).
- **Personal chef system prompt**: static role + food-safety guardrails + output rules. Per-user context (dietary, dislikes, memories) passed separately.
- **Three AI pipelines**: recipe generation, URL parsing (SSRF-protected + Jina Reader fallback), modification (version chains). All structured-output + Zod-validated.
- **AI memory core** pulled forward from 1E (getChefContext/writeMemory).
- **Recipe tRPC router**: list, get, search, generate, importUrl, modify, favorite, delete — all household-scoped.
- **Recipes tab UI**: library grid, debounced search, generate/import dialogs, recipe detail with modify/favorite/delete, optimistic favorites, error/retry states.
- **Provider switch Gemini → OpenAI gpt-4.1-mini**: original Gemini key had depleted credits. GPT-4.1-mini was already the planned production workhorse, so switched primary (one-line config change). Adapter was already installed.
- **Ran `/review` (4-lens internal) + `/codex-review` (independent)** at the phase boundary. Fixed all findings across two rounds: SSRF hardening (DNS resolution + manual redirect re-validation), prompt-injection delimiters, moved user content out of system prompt into delimited user message, output bounds validation/sanitization before DB writes, retry classification via structured error fields, optimistic-update race fix, removed dead cursor pagination, error/retry UI states, nested-button hydration fix.
- **30 tests passing**, lint/typecheck/build all clean.

### Major debugging (resolved)
- **DB connection hung**: Supabase transaction pooler requires `ssl: "require"` in the postgres client (connection string had no sslmode param).
- **Dev server wouldn't load in browser (proxy deadlock)**: Next.js 16 `proxy.ts` calling `supabase.auth.getUser()` deadlocks after the first request in the long-lived Turbopack proxy runtime (accumulating auth-lock state). Fix: proxy now does fast cookie-presence routing only; real auth verification stays in tRPC `protectedProcedure`. (Compared against working FFOS setup to isolate.)
- **OpenAI strict structured output**: rejects Zod `.optional()` fields. Fix: AI schema uses `.nullable()`, normalizers convert to clean DB shape.
- **AllRecipes 403**: major recipe sites block server-side fetches (Cloudflare). Fix: Jina AI Reader fallback (free, headless-browser proxy) when direct fetch is blocked.

### Decisions made
- **AI provider abstraction: Vercel AI SDK v6** (not custom). Implements our exact interface; provider swap is config-only.
- **Primary LLM: OpenAI gpt-4.1-mini** for development (Gemini deferred; can route per-task later).
- **Recipe images: text-forward for V1** (recommended; no hero-image generation — defer to polish/V1.5).
- **Proxy does cookie-presence routing only** — real auth in tRPC. Avoids the Turbopack proxy deadlock and is defense-in-depth.
- **AI URL import: direct fetch → Jina Reader fallback.** Jina is free/no-signup; swap to Firecrawl later if more robustness needed.

### Milestone M2: ACHIEVED
- Generate a recipe from a prompt, import from a URL, modify into a new version, browse/search the library — all working end-to-end against the real API.

### What's next
- Phase 1C: Plan Tab (the signature "AI generates your week" experience, all 6 Figma states).
- Deferred from 1B review: streaming for user-facing generation (wire `generateStream` into the UI — flagged but it's a focused 1C task), `confirm()` → AlertDialog, dedup the two AI dialogs.

## Session 13–14 — 2026-07-06 (resumed after ~5 weeks)

### What happened
- **Session recovery**: located the Session 12 testing session from transcripts; restored full test-loop state (Tests 1–3 passed, drawer fix awaiting retest). Original transcript has since expired — test state now lives in `whats-next.md`.
- **Fixed the localhost login blocker**: Google OAuth appeared broken, but sign-in was actually succeeding. Root cause: the proxy's session check (`endsWith("-auth-token")`) missed **chunked** Supabase cookies (`sb-*-auth-token.0/.1`) that Google OAuth sessions produce, so authenticated users were bounced back to /login forever. Fix: regex matching chunked names (deliberately excluding `-code-verifier`). Also added `http://localhost:3001/**` to Supabase Redirect URLs.
- Griffin briefly landed on the stale Vercel deploy (still pre-1B scaffold) and mistook it for a regression — flagged deploy refresh as a next-session item.
- **Deep security audit** (read-only agent, full app): 1 HIGH, 5 MEDIUM, 6 LOW. Core came back solid (tRPC auth/scoping, prompt-injection hygiene, SSRF guards, secrets, XSS all verified clean).
- **Hardening pass — all findings fixed except deliberate deferrals**:
  - H1: RLS captured into the tracked migration chain (`0002_rls.sql`) + static CI test (`src/server/db/rls.test.ts`) that fails if any table ships without RLS+policy. `is_household_member()` now pins `search_path` (SECURITY DEFINER hijack class). No FORCE: app role has BYPASSRLS, so RLS guards the anon/PostgREST path; app-layer scoping is the primary control (documented in the migration).
  - M1: `(app)` layout now verifies the session per-request via `getClaims()` (the "documented but missing" second leg of the auth model).
  - M2: AI timeouts wired (30s one-shot / 60s streams, fresh AbortSignal per retry attempt).
  - M3: security headers (CSP frame-ancestors 'none', nosniff, referrer-policy, permissions-policy).
  - M4: **daily AI budget** (150 calls/user/day) enforced in Postgres via atomic upsert (`ai_usage_daily` table, migration `0003`) — distributed across serverless instances, wired into `aiProcedure` + the stream route. Per-minute in-memory limiter unchanged.
  - M5: **83 tRPC router tests** added (9 co-located files): auth rejection + household scoping per procedure, budget exhaustion, onboarding race, ILIKE escaping. Full suite now 163 tests.
  - L1: CSRF origin check on `/api/plan/stream`. L2: `shadcn` → devDependencies (hono HIGH advisory out of prod tree). L3: onboarding race closed (unique index on `household_members.user_id` + transaction + loser-recovery). L4: ILIKE wildcard escaping in `recipe.search`. L5: `.env.example` corrected.
  - Deferred deliberately: distributed per-minute limiter (needs Upstash/KV; daily budget already covers cost abuse), full nonce-based CSP, Next bump for postcss advisory, L6 provider-adapters dir (cosmetic).
- Migrations 0002 + 0003 applied to the live Supabase DB and verified.
- Gauntlet green end-to-end: lint, typecheck, 163/163 tests.

### Testing infrastructure note
- Test-mock construction uses `as unknown as` casts in exactly one place per router test file (bridging mock db/supabase into `createCaller`) — a documented exception to the no-cast rule; alternative (hand-written fakes of generated types) is a worse trade.

### Where the test loop stands
See the table in `whats-next.md`. Pickup point: drawer retest (3R), then Tests 4–8.
