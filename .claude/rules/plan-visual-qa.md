---
globs: src/components/plan/**/*.tsx, src/app/(app)/plan/**/*.tsx, src/app/globals.css
---

# Plan-tab visual QA rule

You are editing Plan-tab UI. DOM/behavior tests (`npm run test:e2e`) don't catch "the code says one thing, the screen shows another" — the visual layer does. Before wrapping a Plan-tab feature, after the mechanics are green:

- **Run `/visual-qa`** — it captures every Plan state, you LOOK at the screenshots, critique against `docs/design/visual-qa-rubric.md`, fix, and iterate to the bar (0 blockers + 0 high) before Griffin sees it.
- Run **Layer B** (real content) when content quality could be affected (new copy, chips, plan generation): `E2E_LIVE_CAPTURE=1 E2E_REUSE_BUILD=1 npx playwright test -c playwright.capture-live.config.ts`.
- Real product/taste questions the audit surfaces → raise with Griffin, don't force them green.

Full loop: `.claude/commands/visual-qa.md`. Rubric: `docs/design/visual-qa-rubric.md`.
