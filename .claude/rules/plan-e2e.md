---
globs: src/components/plan/**/*.tsx, src/components/ui/drawer.tsx, src/app/api/plan/**/*.ts, src/server/trpc/routers/plan.ts
---

# Plan-tab E2E rule

You are editing code the Playwright E2E suite covers (Plan tab). Before wrapping:

- **Run `npm run test:e2e`** (self-contained: builds + starts its own server on 3102, deterministic AI mock, no OpenAI spend). After a build, `E2E_REUSE_BUILD=1 npm run test:e2e` skips the rebuild.
- **Extend the specs** in `tests/e2e/specs/` for any new Plan-tab behavior — a feature isn't done until its mechanics are covered. `docs/test-plan.md` is the 1:1 catalog.
- If a spec surfaces a real product question (not a bug), mark it `test.fixme` with a comment and flag Griffin — do NOT weaken the assertion to force green.
- When the mechanics pass, tell Griffin the feature is machine-verified and ready for his **taste** review (reads well? chips sound like imperatives? feels right?) — don't hand him a full click script.

Full context: `tests/e2e/harness/README.md` and CLAUDE.md → "E2E test suite".
