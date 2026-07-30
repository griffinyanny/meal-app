# Product Roadmap - Meal Management App

High-level phased roadmap. For detailed features, see `feature-ideas.md`. For decisions behind these phases, see `decisions.md`.

---

## Phase 0: Discovery & Design
**Status**: COMPLETE (launched 2026-03-29, completed 2026-05-26)
**Problems solved**: None (discovery phase — no code)
**What happens**: Competitive deep-dives, design exploration in Figma Make, wireframing, prototype iteration, resolve open design questions (AI interaction model), lightweight technical spikes (LLM benchmarking, recipe parsing tests)
**Exit criteria**: Approved Figma prototypes for core V1 screens, AI interaction model decided, all open questions resolved, master plan finalized
**Key risk**: AI interaction model is unresolved — must prototype and decide before development

## Phase 1: Infrastructure Sprint + V1 Build
**Status**: READY TO START (Phase 0 complete, architecture plan approved 2026-05-26)
**Problems solved**: None directly (infrastructure), then V1 core problems
**What gets built**: Project scaffolding, core data model, AI service layer, auth, phone-form-factor shell, then all V1 features (recipes, plan, groceries, preferences, onboarding)
**Key risk to validate**: AI recipe parsing from URLs (technical spike in Phase 1B)
**Full plan**: `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md`

## V1: "The 10-Minute Weekly Ritual"
**Status**: Included in Phase 1 build plan
**Problems solved**: Recipe amnesia, recipe modification, recipe-to-list, weekly list burden, decision fatigue
**Core features**: Recipe library (URL import + AI generation + modification), weekly meal planner, auto-generated grocery list with smart merging, dietary preferences, contextual AI, AI-guided onboarding
**Success metric**: No idea what to cook -> grocery list ready in < 10 minutes
**What's NOT in V1**: Cook mode (V1.5), household sharing UI (V1.5), real-time sync (V1.5), pantry (V1.5), ordering (V2), photo import (V2), nutrition display (V3)

## V1.5: "Know What You Have"
**Status**: Not started
**Problems solved**: Don't know what to make with what I have, unnecessary items on grocery list
**Core features**: Light pantry (binary have/don't have), "what can I make?", basic expiration awareness, household sharing
**Key risk**: Pantry must be zero-friction or it won't get used

## V2: "From Plan to Doorstep"
**Status**: Not started
**Problems solved**: Grocery ordering is manual, can't capture recipes from photos/social, freshness/schedule awareness
**Core features**: photo/social recipe import, freshness-aware planning, store aisle mapping, grocery ordering (see below)
**Ordering status (2026-07-30)**: **Instacart is the target and is blocked on them** — applications closed, no waitlist, no date. It is worth waiting for: ~98% of US households in one integration. **Kroger is the only open grocery API in the US** (~10% share) and serves as a hedge, not a strategy. R1 ships no ordering; the 1D clipboard export is the answer until this unblocks. Full TAM analysis in `technical-research.md`.
**Key risk**: Cart integration failures destroy trust — manual list must always work perfectly. **Second risk, new:** this feature's ceiling is set by a third party's application queue, so nothing downstream (notably pricing) should be gated on it.

## V3: "Your Kitchen Intelligence"
**Status**: Not started
**Problems solved**: Diet adherence at depth, recurring purchase automation, product/restaurant guidance
**Core features**: Nutrition engine, health coaching, smart reordering, restaurant guidance, product research, advanced pantry

## V4: Native Mobile
**Status**: Not started
**Problems solved**: App needs to be on the home screen
**Core features**: iOS app (React Native), push notifications, share extension, offline support, then Android
