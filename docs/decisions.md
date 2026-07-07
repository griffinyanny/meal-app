# Decisions Log - Meal Management App

All confirmed product and technical decisions. Each entry includes the decision, rationale, and date.

---

### Product Decisions

**Target user for V1: Solo health-conscious adult** (2026-03-28)
- Rationale: Griffin's own profile. Household/family features deferred to V1.5. Keeps V1 scope tight.

**Phasing: V1 -> V1.5 -> V2 -> V3 -> V4** (2026-03-28)
- V1: Recipe capture + meal planning + grocery list (the core loop)
- V1.5: Light pantry + household sharing
- V2: Grocery ordering + photo/social import + aisle mapping
- V3: Health coaching + nutrition + smart reordering + restaurant guidance
- V4: Native mobile (iOS then Android)
- Rationale: Validated by research — prove the core loop before layering complexity. Pantry and cart integration are high-risk and should be progressive.

**AI interaction model: "AI generates the UI"** (2026-03-30, evolved from 2026-03-28)
- Not chat-first. Not static UI with AI bolted on. The AI dynamically assembles personalized interfaces based on user context, history, and intent.
- The system comes to the user with a proposal (pre-populated meal plan, suggested recipes, etc.) — user reacts, tweaks, and confirms rather than creating from scratch.
- Gets faster over time: Week 1 asks questions, Week 12 presents a near-ready plan.
- Modifications are conversational when needed (natural language input, voice dictation), but the primary interaction is reviewing and adjusting AI-generated proposals.
- Evolution: Started as "contextual AI everywhere" (Session 1) → debated "chat-first" (Session 2) → pushed back on chat-first due to speed/repeat-use concerns → landed on "AI generates the UI" (Session 3).
- Rationale: Differentiates from every competitor (all use static UIs). Avoids ChatGPT-clone feel. Aligns with agentic "get it done" vision. The risk is high (harder to build, AI must be good or experience feels broken) but the differentiation is real.

**Monetization: Freemium** (2026-03-28)
- Free trials and/or investment-locking to drive subscription
- Details TBD in later phases

**Working name: "meal-app"** (2026-03-28)
- Branding/naming deferred to later

**Phase 0 is Discovery & Design, not code** (2026-03-29)
- No code gets written until Phase 0 exits
- Phase 0 = competitive deep-dives, Figma wireframing/prototyping, resolving open design questions, lightweight technical spikes only
- Exit criteria: approved Figma prototypes, AI interaction model decided, all open questions resolved
- Rationale: Griffin wants proper discovery before development. Design and product decisions should be validated through prototypes, not built-then-revised.

**Household sharing (dual account ownership) in V1, not V1.5** (2026-03-29)
- At least two-person account sharing (partner/roommate) in V1
- Shared recipe library, meal plan, and grocery list with real-time sync
- Rationale: Griffin flagged this has deep infrastructure implications (auth, data scoping, real-time sync, conflict resolution) that are much harder to retrofit. Building single-user first and adding sharing later would mean significant rework.
- Future impact: This means Phase 1 infrastructure must include household data model, real-time sync setup (Supabase Realtime), and multi-user auth from day one. It also means V1 UI needs to handle shared state (e.g., both people editing a grocery list simultaneously).

**Core product principle: Nail before expanding** (2026-03-29)
- Nail 1-2 core flows perfectly before adding features. The feature list will spiral — capture ideas in the backlog but resist building until current flows are proven.
- Rationale: Griffin recognizes the feature brain dump is already large. Discipline is key for a long-running build.
- How to apply: Check Griffin (and ourselves) on scope creep. Every feature proposal gets asked: "Is this making the core flow better, or is it scope creep?"

**Figma as design tool with MCP integration** (2026-03-29, refined 2026-03-30)
- Figma Make for wireframing and prototype generation from text prompts
- Figma MCP Server to bridge Claude Code (context) and Figma (design)
- **Operating model (researched 2026-03-30)**: Claude Code = brain (all product context). Figma Make = design hand. `Guidelines.md` = bridge document.
  - Claude Code generates a `Guidelines.md` + structured first prompt for each Make session
  - Griffin pastes Guidelines.md into Make's code editor and uses the prompt to generate
  - Iterate visually in Make (3-5 rounds), come back to Claude Code for strategic questions
  - Claude Code reads Make outputs via `get_design_context` MCP tool
  - Can create a Make template with Guidelines.md pre-loaded to avoid re-pasting
- **Key limitations**: Make files are file-scoped (no org-wide shared context). MCP can read Make files but only write to Design files. ~50-70 prompts/month on Pro plan (3,000 credits). Multiple short guideline files beat one large file.
- **Sequencing**: Guidelines.md will be written AFTER IA and competitive taste profile are locked — not before.
- Rationale: Griffin has Figma Pro. Research confirmed Guidelines.md is the optimal context bridge. Writing it prematurely wastes Make credits on designs that will change.

**Design direction: Crouton + Flighty inspired** (2026-04-05)
- Dark mode first. Crouton/Flighty-inspired design patterns: clean typography hierarchy, limited color palette (1-2 accent colors), smart inline features, no cheesy graphics/emojis/celebration animations.
- Web V1 aims for the *spirit* of these apps (patterns, feel, principles) without needing pixel-perfect liquid glass polish. That comes with native iOS.
- Primary reference: Crouton (recipe-domain baseline). Secondary: Flighty (quality bar, data-dense-but-airy feel). Tertiary: Robinhood (illustration style, IA model), Mela (minimalism), Function Health (AI interaction flow).
- Anti-references: Cooklist, Mealime, Samsung Food — everything "cheesy," "amateurish," or "childish."
- Rationale: The entire competitive set looks amateur. Design sophistication is a legitimate differentiator that expands the addressable market beyond "utilitarian home cooks." Griffin's aesthetic preferences are strongly held and consistent.

**Platform sequencing confirmed: Web-first** (2026-04-05)
- Web app (phone form factor) for V1 to validate the AI planning flow.
- Design will use Crouton/Flighty *patterns* without needing native-level liquid glass polish.
- Native iOS investment comes later when product is validated and potentially a designer is involved.
- Rationale: Faster iteration, no App Store friction, API-first architecture means iOS is a frontend swap not a rewrite. V1 is for Griffin + wife — product validation matters more than pixel polish.

**AI interaction surface: Not a dedicated tab** (2026-04-05)
- AI is the UI, not a separate surface. No dedicated "Chat" or "AI" tab like Function Health.
- The bottom card/sheet pattern from Flighty is a tool in the toolbox if we need a persistent AI surface that comes and goes, but it's not a design requirement.
- This reaffirms the "AI generates the UI" decision (2026-03-30) and rules out a Function Health-style AI chat tab.
- Rationale: The whole point of "AI generates the UI" is that every screen IS AI-generated. A separate chat tab implies AI is an add-on, which contradicts the core interaction model.

**AI interaction surface paradigm: "Content IS the Conversation"** (2026-05-26, builds on 2026-04-05 and 2026-03-30)
- The plan screen (and all screens) use a layered interaction model:
  - Primary (70%): Direct manipulation on AI-generated cards — swipe, tap, chip selection
  - Secondary (20%): "Talk to the Chef" — a named, visible free-form input surface on the hero card for natural language intent (replaces generic "Make changes" or chat bars)
  - Tertiary (10%): Structured multi-turn clarification through tappable option cards (not chat)
- The AI's voice runs through the output: plan-level summary, card-level rationale, change-level acknowledgment. Brief, specific, woven into UI — not a separate conversation thread.
- Screen adapts to state: no plan → input-led; plan exists → plan-led with input accessible.
- Validated by: (1) ChatGPT deep research on AI-native UI paradigms (reference/ai-native-design-research.md), (2) alignment with Samsung Food, Jow, Instacart Smart Shop patterns, (3) pushes beyond research with generative meals, live transformation, AI-generated situational chips.
- Eliminates: sparkle FAB, persistent chat bar, generic AI buttons.
- Preserves: free-form natural language input, voice dictation, AI personality, multi-turn intelligence.
- "Talk to the Chef" is a working label — final naming TBD.
- Rationale: Balances Griffin's push for innovation (no generic AI chrome) with the practical need for unstructured input (complex multi-constraint requests are genuinely faster via dictation than card manipulation). The AI generates structured output regardless of input method, so cards and free-form aren't competing — they're different entry points to the same plan.
- Future impact: This paradigm must scale to all four tabs (Plan, Recipes, Groceries, You). The "Talk to the Chef" concept and card-level rationale lines become reusable components. The structured multi-turn pattern (option cards for clarification) becomes a system-wide interaction.

**Recipe discovery: AI-generated suggestions + import, not a catalog** (2026-04-05)
- No built-in recipe catalog or infinite scroll browse experience.
- Recipe discovery is: (1) AI-generated suggestions personalized to user, (2) import from share menu (Instagram, Safari), (3) URL import, (4) natural language search ("something light with salmon for Thursday"), (5) recipe library (saved/generated/imported) with strong recents.
- Rationale: Griffin's own behavior confirms he doesn't browse recipe catalogs. He asks AI or searches for specific things. His wife shares from Instagram. Building a catalog would compete with NYT Cooking's photography budget and isn't differentiated.
- Future impact: This means we need excellent recipe import (share target on iOS is critical), strong AI generation quality, and good recents/library UX. We do NOT need a content team, recipe partnerships, or a recommendation engine based on a catalog.

**Information Architecture: Plan | Recipes | Groceries | You** (2026-04-12)
- Four tabs, four nouns. Each tab owns a core object.
- **Plan** — the landing screen. AI-generated weekly meal plan, contextual to time of week. The AI input bar here doubles as the general "talk to your chef" surface. Absorbs: weekly planning, AI proposals, dinner parties, leftover intelligence, freshness warnings, batch prep coaching, weekly review, quick win suggestions, collaborative planning, weekly nutrition summary (V3), general AI queries.
- **Recipes** — personal cookbook. Recents at top (NYT Cooking pattern). AI-powered search bar. All import methods (URL, photo, social, share menu). Cook mode is an immersive overlay accessed from recipe detail, not a tab. Absorbs: library, import, AI generation, search, cook mode access, ingredient detail pages, skill progression.
- **Groceries** — the shopping list + pantry (V1.5+) + checkout (V2+). Auto-synced from Plan (no manual sync step). Check-off for in-store use. Pantry is a section/toggle within Groceries (not its own tab) because "what I have" is the flip side of "what I need." Absorbs: shopping list, pantry, ordering/checkout, aisle mapping, spending analysis, staples/reordering, barcode/receipt scanning.
- **You** — preferences, memory audit, household management. Rarely accessed — the backstop, not the primary experience. Absorbs: dietary preferences, memory audit, household/family profiles, store account linking, account/settings.
- **AI input bar** appears on every tab, contextual to the screen. On Plan it's the general "ask your chef anything" surface. On Recipes it searches/generates. On Groceries it adds items via natural language. Voice dictation available everywhere.
- Rationale: Stress-tested against every feature in V1 through V4 plus all unphased ideas. No feature requires a 5th tab or restructuring. "Home" was rejected because it becomes a junk-drawer dashboard that dilutes the core experience. "Plan" bounds scope clearly (everything relates to what you're eating) while the input bar expands it to general queries. Pantry fits inside Groceries. Cook mode is an overlay from recipe detail. Matches Robinhood's 4-tab-with-depth model.
- Future impact: V1.5 pantry adds a section to Groceries. V2 ordering adds checkout flow to Groceries + store setup to You. V3 nutrition adds cards to Plan and recipe detail. No IA changes needed.

### Technical Decisions

**Architecture: API-first via tRPC** (2026-03-28)
- All core business logic goes through tRPC API layer, NOT Server Actions
- Rationale: Multi-client requirement (web -> iOS -> Android). tRPC gives end-to-end type safety and can later serve mobile clients via standalone server or OpenAPI spec. Server Actions create a monolithic web app that can't serve native clients.

**Tech stack** (2026-03-28)
- Next.js (App Router) + TypeScript
- tRPC v11 for API layer
- Supabase (Postgres + Auth + Realtime + Storage)
- Drizzle ORM for database
- shadcn/ui + Tailwind CSS for UI
- Anthropic Claude API for AI service layer
- Vercel for deployment
- Rationale: Griffin already uses this stack (minus tRPC) in budget-app. Minimal new learning. Supabase ecosystem covers auth, realtime, and storage needs.

**Recipe data model: Versioned documents with JSONB** (2026-03-28)
- Recipes store ingredients/steps as structured JSONB in Postgres
- Version history via parent_id linking (AI modifications create new versions, originals preserved)
- Rationale: Users need to modify recipes without losing originals. Research shows recipe loss/disappearance is a major trust breaker.

**Household data model from day one** (2026-03-28)
- Every entity (recipes, plans, lists, pantry, preferences) belongs to a household
- Rationale: Even though V1 is single-user, the data model must support multi-user from the start to avoid painful migration later.

**Phone-form-factor web app** (2026-03-28)
- Max-width 430px centered on desktop, full-width on mobile, bottom tab navigation
- Rationale: Designing for eventual iOS port. Web app should feel like a phone app.

**Project structure: Single Next.js app, not monorepo** (2026-05-26)
- Clean internal separation: `src/server/` (tRPC + DB + AI) vs `src/app/` (frontend). Not Turborepo.
- When mobile arrives (V4), extract `src/server/` into a standalone tRPC server. Mechanical refactor, not rewrite.
- Rationale: Monorepo adds 1-2 weeks of setup for V1 web-only. The clean separation makes future extraction easy.

**Auth: Google SSO + magic link from V1** (2026-05-26)
- Consumer app — Google SSO is table stakes for conversion. Magic link as email fallback.
- Apple Sign-In deferred to iOS build (V4).
- Rationale: "Enter email → check inbox → find link → click it" kills consumer conversion. Most consumer apps see 50-70% Google SSO adoption.

**Household sharing: Infrastructure only in V1** (2026-05-26, refines 2026-03-29 decision)
- Every table has `household_id` (data model is multi-user ready). Single-user in V1.
- Full sharing UI (invite, real-time sync, conflict resolution) deferred to V1.5.
- Rationale: Core loop validation first. The hard part (data model) is done; the UI is additive.
- Future impact: No Supabase Realtime in V1. Adding it in V1.5 is a UI + subscription build, no schema migration.

**Cook mode: Deferred to V1.5** (2026-05-26)
- Recipe data model supports it (structured steps with timers in JSONB).
- Rationale: Not in the core loop (no idea → plan → grocery list). Data model supports it; it's a UI layer to add later.

**Analytics: PostHog** (2026-05-26)
- Open source, best Next.js integration, 1M events/month free, low vendor lock-in.
- Vendor abstraction layer (`analytics.track()`) built in Phase 1; PostHog SDK installed in Production Readiness phase.
- Rationale: Evaluated PostHog, Mixpanel, Amplitude, Vercel Analytics, custom Supabase, Segment. PostHog wins on open source + breadth of free tier + Next.js SDK quality.

**Error tracking: Sentry** (2026-05-26)
- Free tier: 5K errors/month. Official Next.js SDK.
- Installed in Production Readiness phase, not Phase 1.
- Rationale: 2 users (Griffin + wife) don't need Sentry. Install when preparing for wider release.

**LLM integration: Structured output tool, not an agent** (2026-05-26)
- Deterministic code always in control. LLM generates structured data (Zod-validated JSON). Our code validates, processes, and writes to DB.
- LLM never queries database, controls navigation, or acts autonomously.
- Rationale: Reliability (Zod catches garbage), security (LLM can't access unauthorized data), testability (mock LLM, test everything else), swappability (change providers by changing one adapter).

**Memory system: Dual approach** (2026-05-26)
- Structured `user_preferences` table (dietary framework, restrictions, cook times) for the settings UI.
- Unstructured `ai_memories` table (text log with category, confidence, source_type) for behavioral signals.
- No vector store in V1 — recency + category filtering sufficient for hundreds of memories.
- Rationale: Structured data for what users configure explicitly. Unstructured data for what the AI learns implicitly. pgvector added in V2/V3 when memory corpus grows.

**Supabase new API keys** (2026-05-27)
- Use new publishable (`sb_publishable_...`) and secret (`sb_secret_...`) keys, not legacy JWT-based anon/service_role keys.
- Drop-in compatible with `@supabase/ssr` and `@supabase/supabase-js`. No code changes needed.
- Rationale: Legacy keys will be removed late 2026. New keys support instant rotation and audit logging.

**Database connection: Transaction pooler** (2026-05-27)
- Using Supabase's PgBouncer transaction pooler (port 6543), not direct or session pooler.
- `prepare: false` set in postgres client config (required for pooled connections).
- Rationale: Vercel serverless creates a new connection per request. Transaction pooler multiplexes short-lived connections onto a shared pool. Direct connections would exhaust Supabase's connection limit.

**Auto-onboarding via ensureOnboarded mutation** (2026-05-27)
- `user.ensureOnboarded` tRPC mutation creates user + household + membership on first login.
- Uses `authedProcedure` (checks Supabase session only, no household membership required).
- Called from `OnboardGuard` client component in the `(app)` layout.
- Full AI-guided onboarding interview deferred to Phase 1E.
- Rationale: Simplest path to working auth. The database records must exist before any `protectedProcedure` call works.

**AI provider abstraction: Vercel AI SDK v6** (2026-05-27)
- Use the Vercel AI SDK (`generateObject`/`generateText`/`streamObject`) rather than a hand-rolled provider abstraction. Our `src/server/ai/index.ts` wraps it with retry + logging; `config.ts` maps each AI task to a model.
- Rationale: The SDK already implements our exact designed interface (`generateStructured`/`generateText`/`generateStream`), with Zod structured output, streaming, retries, and one-line provider swaps. Building custom would be a worse reimplementation. Validated against system-architect reasoning ("don't build infrastructure you can buy").

**Primary LLM: OpenAI gpt-4.1-mini** (2026-05-27, supersedes Gemini-first prototyping plan)
- All recipe tasks route to `gpt-4.1-mini` via `config.ts`. Switched from Gemini (the prototyping key had depleted credits).
- gpt-4.1-mini was already identified in `technical-research.md` as the likely production workhorse (best structured-output guarantees, ~$0.0015/recipe). Per-task model routing remains available for future tuning.
- **OpenAI strict structured output caveat**: rejects Zod `.optional()` fields and min/max/maxItems keywords. The AI schema in `tasks/types.ts` uses `.nullable()` (no min/max); `validateAiRecipe` does bounds-checking/sanitization after generation; normalizers convert nullable → clean DB shape.

**Recipe images: text-forward for V1** (2026-05-27)
- No hero-image generation or storage in V1. Recipe cards/detail are text + metadata.
- Rationale: image generation adds cost and complexity without validating the core loop. Revisit in polish/V1.5.

**Proxy does cookie-presence routing only; real auth in tRPC** (2026-05-27)
- `src/proxy.ts` / `updateSession` checks for the `sb-*-auth-token` cookie to decide login redirects. It does NOT call `supabase.auth.getUser()`.
- Rationale: In Next.js 16's long-lived Turbopack proxy runtime, creating a Supabase server client and calling `getUser()` deadlocks after the first request (accumulating auth-lock state) — it hung the whole dev server. Real auth verification already happens server-side in every tRPC `protectedProcedure`, so the proxy only needs coarse routing. Defense-in-depth, and can't hang (no network call).
- Future impact: if server components ever need fresh session tokens, revisit token-refresh strategy (the Supabase browser client refreshes client-side today).

**AI URL import: direct fetch → Jina Reader fallback** (2026-05-27)
- `parseRecipeUrl` tries a direct browser-headed fetch first; on 403/401/block it falls back to Jina AI Reader (`https://r.jina.ai/<url>`), which runs a real headless browser and returns clean markdown.
- SSRF-hardened: protocol allowlist + DNS resolution + private-IP blocklist + manual redirect re-validation, all before fetching. User content from scraped pages is wrapped in `<untrusted_page_content>` delimiters in the prompt.
- Rationale: major recipe sites (AllRecipes, etc.) block server-side fetches via Cloudflare; headers alone don't fix it. Jina is free/no-signup and purpose-built for LLM ingestion. Swap to Firecrawl (paid, more robust) later if needed.
- Accepted risk: DNS-rebinding TOCTOU between validation and fetch is not fully mitigated (full IP-pinning breaks SNI and is overkill for a 2-user app).

**AI prompt structure: static system prompt, user context in delimited user message** (2026-05-27)
- The personal-chef system prompt is static (role, food-safety, output rules). Per-user data (dietary framework, restrictions, dislikes, memories) is passed in the user message wrapped in `<user_context>`.
- Rationale: enforces the `ai-pipelines.md` rule (user content never interpolated into system prompts). Free-text memories are user-derived and could carry injected instructions — keeping them at user privilege (not system) prevents a poisoned memory from issuing system-level commands. Flagged by both `/review` and `/codex-review`.

### Phase 1C: Plan Tab Decisions (2026-05-28)

**Plan generation produces lightweight "meal concepts," not full recipes** (2026-05-28)
- Generating a week produces ~5 lightweight meal concepts per slot (title, one-line rationale, ~6 ingredient-preview pills, cuisine/effort tags, est. time), NOT full recipes. Full recipes (real quantities, steps, timers) are generated lazily by the existing 1B recipe pipeline at two boundaries: (1) batch-expand the whole week **on confirm** ("Looks good"), which feeds the grocery list; (2) expand a single meal **on cook** if not already expanded.
- Rationale: fidelity should be generated at the moment of *commitment*, not the moment of *consideration*. During planning the user is browsing/swapping/regenerating — cheap disposable concepts are the right fidelity. Full generation per slot at plan time would be 5–7× the tokens/latency (blows the 7–20s budget), and most generated recipes are swapped or skipped (wasted spend). Concepts are cheap to throw away; full recipes are expensive to throw away — which is exactly the "things change" risk. The work doesn't disappear, it relocates to the confirm boundary (where the grocery list needs real quantities anyway) and the cook boundary. Mirrors how a chef works: sketch the week loosely, then write the actual recipes/shopping list once the week is locked. Also keeps the Recipes library clean (un-cooked concepts don't pollute it) and scales to future "pre-draft next week" without burning speculative generations.
- Future impact: requires extending `meal_plan_slots` with concept columns (title, description, ingredientPreview jsonb + Zod, tags, estTimeMinutes, list-view chips). `recipeId` stays nullable, populated only on lazy expansion. Migration + RLS CI check required. Confirm flow gains a batch-expand step ("building your list…").

**Plan scope: dinners only for V1** (2026-05-28)
- The weekly plan generates dinners only in V1. The `meal_type` enum already supports breakfast/lunch/snack — adding them later is generator config, not a migration.
- Rationale: every Plan-tab design shows dinners; the North Star is "what's for dinner"; breakfast/lunch are lower-value, higher-noise (repeated/ad-hoc). Keeps the generation schema and token budget tight.

**Plan generation streams from the start (route handler + AI SDK), not a fast-follow** (2026-05-28)
- Plan generation is built streaming-first: a dedicated Next.js route handler (`src/app/api/plan/stream/route.ts`) returns `streamObject(...).toTextStreamResponse()`; the client consumes it via `experimental_useObject` from `@ai-sdk/react` (to be installed). The handler replicates `protectedProcedure`'s auth (Supabase `getUser` + household resolution) and persists the plan + slots transactionally on stream finish; the client then settles onto the canonical persisted plan via a tRPC `plan.current` refetch. Modify/confirm/feedback stay in tRPC.
- **Rule carve-out (deliberate, documented):** AI *generation streaming* endpoints may live as route handlers. All other DB mutations stay in tRPC. The "all mutations through tRPC" rule's intent (centralized auth, no direct DB from components, Zod-validated writes) is preserved because the handler reuses the same auth + Drizzle + validation server-side.
- Rationale: generation is 7–20s on the signature screen — a static spinner is unacceptable, and watching the week materialize is on-brand for "AI generates the UI." Griffin chose streaming-first over the de-risked plain-first sequencing (accepting a slightly slower path to M3) because the materializing-week experience is core, not polish. The route-handler mechanism is the well-trodden AI SDK path; tRPC-native partial-object streaming (httpBatchStreamLink + async generators) was rejected as awkward with superjson.

**Plan cards: text-forward for V1; images deferred pending cost-effective approach** (2026-05-28, resolves design/decision conflict)
- The Figma briefs assume hero food photography + thumbnails, but V1 ships text-forward (no images), consistent with the 1B "text-forward for V1" decision. Cards must look genuinely premium without photos (typography- and glass-led, à la Crouton/Mela) — no broken-image wells or empty placeholders.
- Rationale: AI image generation is expensive; generated meals have no natural image source; stock-photo matching is unreliable. But the mocks *do* look notably better with imagery, so this is a "ship without, but solve later" — a cost-effective image strategy is a real future need, captured in the backlog. Griffin explicitly wants the no-image version to look great so we *can* ship without them.

**Plan modification returns a targeted diff, not a full regeneration** (2026-05-28)
- "Make Tuesday lighter" returns structured slot-level operations (replace slot X with concept Y, swap, mark eating-out), applied transactionally — it does NOT regenerate the whole week. Every AI-returned `slotId` is validated to belong to the household's plan before applying (never trust AI-returned IDs).
- Rationale: full regen would wipe untouched slots' feedback/confirmed state and cost ~5× for a one-meal change. Diffs preserve the rest of the plan and are cheaper.

**Rate limiting middleware added in 1C** (2026-05-28)
- A minimal per-user rate-limit middleware is added to the tRPC layer now and applied to AI-calling procedures (plan generate/modify, and retrofitted to recipe generate/importUrl/modify). Closes the existing repo-wide gap against the `trpc-routers.md` rule.
- Rationale: plan generation is the most expensive AI call; a bug looping generation could quietly burn the OpenAI key. Cheap insurance even for a 2-user app. The rule already requires it and nothing implemented it.

**V1 Plan Model: Rolling 7-day plan from creation day** (2026-05-29)
- The V1 plan is a fixed 7 days starting today (UTC). `dayOffset 0` is the day you create the plan; `dayOffset 6` is six days later. The plan has NO calendar-week alignment — it does not anchor on Sunday or any week boundary. The `meal_plans.week_start` column stores the creation day.
- **One active plan per household.** Generating replaces it outright (delete-all + insert in one transaction). No plan history, no concurrent plans.
- The mid-week ("EARLIER THIS WEEK / rate what you cooked") layout appears only when the plan is `status='confirmed'` AND at least one slot's date is in the past. A draft plan always shows the review layout, no matter what day it is.
- Rationale: The original Figma briefs assumed Sunday-morning planning for the calendar week (Sun–Sat). But real users generate plans mid-week, and every calendar-week model degrades for that case: current-week-with-past-days shows "EARLIER THIS WEEK is full of meals I never cooked"; next-week semantics introduce a 0–6 day holding state before the plan is "live"; user-picks-duration adds configuration before we know users want it. Rolling-7-from-today is the only model that's coherent regardless of when the plan is created, matches the chef metaphor ("plan my dinners"), and stays simple. Validated by reproducing the alternative-model failure modes during Session 12 testing.
- Future impact: The streaming generation prompt is keyed on `dayOffset 0–6`. The mid-week view gating logic depends on this model. The "one active plan" rule means we cannot offer plan history or "draft a future week alongside this one" without revisiting the data model. Alternative mental models (calendar-week current-week, calendar-week next-week, user-selectable start day, user-selectable plan length, auto-inferred-from-intent) are captured in `idea-backlog.md` as real models other users may hold, to consider after the core loop is validated.

### Session 13–14: Security Hardening Decisions (2026-07-06)

**Proxy session check must match chunked Supabase cookies** (2026-07-06)
- The cookie-presence check in `src/lib/supabase/middleware.ts` uses a regex matching `sb-*-auth-token` AND its chunked variants (`.0`, `.1`), while deliberately excluding `sb-*-auth-token-code-verifier` (exists mid-OAuth, pre-authentication — matching it would create a redirect loop).
- Rationale: @supabase/ssr chunks large sessions (Google OAuth always). The old `endsWith` check treated every Google-authenticated user as logged out. This was the entire "login broken" incident.

**RLS lives in the migration chain; no FORCE; app-layer scoping is the primary control** (2026-07-06)
- RLS policies are versioned in `0002_rls.sql` and guarded by a static CI test. FORCE ROW LEVEL SECURITY is deliberately absent: the app's connection role has BYPASSRLS, so FORCE is a no-op. Threat model: RLS protects direct PostgREST/anon-key access; household scoping in tRPC (`ctx.householdId` on every query) protects the app path.
- Future impact: if the app ever moves to a non-owner DB role or plumbs JWTs into the Drizzle connection, revisit FORCE.

**AI cost control is two-layer: in-memory per-minute + Postgres daily budget** (2026-07-06)
- 10 calls/min (in-memory, per-instance, UX guard) + 150 calls/user/day (Postgres atomic upsert, distributed hard cap). Chosen over Upstash/Vercel KV to avoid new infrastructure; Postgres is already shared across instances.
- Future impact: before real signups, move the per-minute limiter to a shared store; the budget table pattern extends to token-based budgets if needed.

**One household per user is a DB constraint** (2026-07-06)
- `household_members.user_id` has a unique index; `ensureOnboarded` creates household+membership transactionally and recovers gracefully when a concurrent call wins. Encodes the V1 single-household model at the database level.
- Future impact: multi-household membership (if ever wanted) requires dropping this index and redesigning `protectedProcedure`'s household resolution.

**Meal-scoped modify uses natural-language injection, not a structured target** (2026-07-06, Session 15)
- When a modify is scoped to a specific meal (card chip or meal-scoped chat), the target day + dish are injected into the request string (`scopedRequest()` in `plan-helpers.ts`), e.g. "swap this for salmon — for sunday's Chicken Tikka." The `plan.modify` procedure stays a single free-text field; the AI resolves the target from the text + the current-meals list. Chosen for consistency (the card chips already worked this way) and minimal surface area over adding a structured `targetDate` to the procedure.
- Future impact: if scoping ever proves unreliable at scale, revisit by passing an explicit target to `plan.modify` and constraining the AI to that slot. Regression test lives in `plan-helpers.test.ts`.

**One active plan: generation replaces the current plan** (confirmed Session 15)
- The stream route's `persistPlan` deletes the household's existing plan and inserts the new one, transactionally. The one-active-plan data behavior is implemented server-side; the gap is purely UI (no regenerate trigger — see open-questions).
- Future impact: plan history / concurrent next-week drafting (deferred idea) would require keying on plan identity instead of "delete all for household."
