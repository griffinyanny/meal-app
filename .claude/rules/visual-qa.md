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

⚠️ **The runner resets CLIENT state between every capture state, and that is load-bearing — do not
remove it.** `captureStates` goes to `about:blank` and then clears the origin's IndexedDB over CDP before
each state's `prepare()`. The seed resets the **server**; this resets the **browser**. Without it a state
inherits the previous state's persisted React Query cache, `staleTime: 30_000` suppresses the refetch that
would correct it, and the capture photographs the **previous** state's screen while the manifest labels it
the new one — which is BUG-053, and it made the Groceries surface silently ungradeable for two sessions.
⚠️ **Order matters:** `about:blank` first, because it destroys the live page and with it any in-flight
refetch or pending persist write that would otherwise land on top of the clear.

⚠️ **Read the manifest, not just the console.** It is written **before and after every state** with an
`in-flight` placeholder in between, so even a hard test timeout leaves a record naming which state was
running. Non-`ok` entries carry `durationMs` plus `diagnostics.visibleText` — what the page was **actually**
showing — which is the half that identifies the bug. A `readyText` timeout otherwise reports only the
string it wanted, never the string it got.

Full loop: `.claude/commands/visual-qa.md`. Rubric: `docs/design/visual-qa-rubric.md`.
