# Plans Index

This directory contains all plans created during the product build. Plans exist at three levels:

## Plan Hierarchy

### Phase Plans (one per major phase)
High-level plans covering an entire phase (V1, V1.5, V2, etc.). Created before starting a phase. Covers architecture, feature scope, dependencies, and success criteria.

- `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md` — Systems Architecture & Phase 1 Plan (approved 2026-05-26). **LOST** — the file was never committed to the `~/.claude` repo and an accidental 2026 deletion made it unrecoverable (discovered Session 18). Its phase skeleton (1A–1F) survives in `docs/changelog.md` Session 9; its scope-tracking role is absorbed by **`docs/scope-v1.md`** (the Release 1 hub, created Session 19), which is now the authoritative phase spine.
- Phase 1A: Foundation Sprint — **COMPLETED** 2026-05-27 (Milestone M1 achieved)
- Phase 1B: AI Core + Recipes — **COMPLETED** 2026-05-27 (Milestone M2 achieved)
- Phase 1C: Plan Tab — **ACTIVE** (see `docs/scope-1C.md`)
- `phase-1.5-pantry-sharing.md` — (not yet created)
- `phase-2-integrations.md` — (not yet created)
- `phase-3-intelligence.md` — (not yet created)

### Feature Plans (one per significant feature)
Detailed plans for individual features within a phase. Created when we're ready to build a specific feature. Covers UI flows, data model changes, API endpoints, AI prompts, edge cases.

Format: `{phase}-{feature-name}.md` (e.g., `v1-recipe-url-import.md`, `v1-grocery-list-generation.md`)

- `~/.claude/plans/resume-meal-app-peppy-simon.md` — **Generation-architecture rethink (BUG-004): cut grocery-list latency.** Move the ~37s batched `ingredient-normalize` off the confirm critical path by normalizing each recipe incrementally during plan review + caching it on the recipe row; confirm becomes the instant aggregate. **COMPLETE — BUG-004 closed + shipped S30.** Phases A–C built S29; S30 applied migration `0005`, built Phase D (honest "Finishing N recipes…" hint + early-confirm instrumentation + GR-L1/GR-L2 E2E), ran the real-model eval (PASSED — per-recipe == batch merge quality; ~27–37s off the confirm path), and fixed a high-sev rate-limit fan-out via `bgAiProcedure`. 306 unit + 53 E2E green. Plan-mode + `system-architect` consulted; architect memo alongside (`…-peppy-simon-agent-a9a263c2c4d111270.md`).

### Spike / Research Plans
Plans for technical investigations or design explorations that inform future work.

Format: `spike-{topic}.md` (e.g., `spike-ai-model-benchmarking.md`)

- `spike-e2e-testing-harness.md` — Playwright E2E harness (auth bypass + AI-mock + seed) so Claude can self-verify UI. **Phase 1 COMPLETE** 2026-07-09 (Session 17): harness built + reusable core in `tests/e2e/harness/`; Plan-tab D1-D7/RG1-RG5/M1-M7/E1-E4/X1-X2 automated + D7 resolved — **30 passing, 0 findings**. Run `npm run test:e2e`. Phase 2 (CI + low-risk G/R/W specs) + Phase 3 (visual) remain. Extending to Recipes/Groceries = catalog + tab AI fixtures + seed builder + specs (small; infra is reused).

## Rules
- Every plan references the overall roadmap (`docs/roadmap.md`) to stay grounded
- Every plan references relevant research from `reference/` when making decisions
- When a plan is completed, mark it with status: COMPLETED and date
- When a plan changes significantly, note the change and reason at the top
- Plans are never deleted — they're historical records of our thinking
