# Plans Index

This directory contains all plans created during the product build. Plans exist at three levels:

## Plan Hierarchy

### Phase Plans (one per major phase)
High-level plans covering an entire phase (V1, V1.5, V2, etc.). Created before starting a phase. Covers architecture, feature scope, dependencies, and success criteria.

- `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` — Systems Architecture & Phase 1 Plan (ACTIVE, approved 2026-05-26). Covers all 6 build phases (1A-1F).
- Phase 1A: Foundation Sprint — **COMPLETED** 2026-05-27 (Milestone M1 achieved)
- Phase 1B: AI Core + Recipes — **NEXT**
- `phase-1.5-pantry-sharing.md` — (not yet created)
- `phase-2-integrations.md` — (not yet created)
- `phase-3-intelligence.md` — (not yet created)

### Feature Plans (one per significant feature)
Detailed plans for individual features within a phase. Created when we're ready to build a specific feature. Covers UI flows, data model changes, API endpoints, AI prompts, edge cases.

Format: `{phase}-{feature-name}.md` (e.g., `v1-recipe-url-import.md`, `v1-grocery-list-generation.md`)

(none yet created)

### Spike / Research Plans
Plans for technical investigations or design explorations that inform future work.

Format: `spike-{topic}.md` (e.g., `spike-ai-model-benchmarking.md`)

- `spike-e2e-testing-harness.md` — Playwright E2E harness (auth bypass + AI-mock + seed) so Claude can self-verify UI. **NOT STARTED** (teed up Session 16, 2026-07-08). Source of cases: `docs/test-plan.md`. Has a paste-in invocation prompt. Can run as a parallel work stream (own branch) alongside feature work.

## Rules
- Every plan references the overall roadmap (`docs/roadmap.md`) to stay grounded
- Every plan references relevant research from `reference/` when making decisions
- When a plan is completed, mark it with status: COMPLETED and date
- When a plan changes significantly, note the change and reason at the top
- Plans are never deleted — they're historical records of our thinking
