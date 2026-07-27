---
globs: src/components/plan/**/*.tsx, src/components/groceries/**/*.tsx, src/components/recipes/**/*.tsx, src/components/you/**/*.tsx, src/components/onboarding/**/*.tsx, src/components/shared/**/*.tsx, src/components/shell/**/*.tsx, src/app/(app)/**/*.tsx, src/app/welcome/**/*.tsx, src/app/globals.css
---

# Visual QA rule

You are editing UI the capture layer covers (**Plan, Groceries, Recipes, You,
onboarding**). DOM/behavior tests (`npm run test:e2e`) don't catch "the code says
one thing, the screen shows another" — the visual layer does. Before wrapping a
feature on one of these surfaces, after the mechanics are green:

- **Run `/visual-qa`** — it captures every state for the surface, you LOOK at the screenshots, critique against `docs/design/visual-qa-rubric.md`, fix, and iterate to the bar (0 blockers + 0 high) before Griffin sees it. Capture only: `npm run test:capture`.
- Run **Layer B** (real content, real spend) when content quality could be affected — new copy, chips, generation, or any change under `src/server/ai/providers/e2e-fixtures/`: `npm run test:capture:live`. Cadence + what's owed: `docs/test-plan.md` → "Layer-B cadence".
- Real product/taste questions the audit surfaces → raise with Griffin, don't force them green.

Full loop: `.claude/commands/visual-qa.md`. Rubric: `docs/design/visual-qa-rubric.md`.
