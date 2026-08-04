---
globs: src/components/**/*.tsx
---

# React Component Rules

- Max 300 lines per component. Extract sub-components into the same directory when exceeded.
- Explicit TypeScript prop types (no inline object types). Export the props type.
- Use `cn()` from `@/lib/utils` for class merging. Never string-concatenate Tailwind classes.
- Glass-morphism utilities: use `.glass-surface`, `.glass-sheet`, not raw backdrop-blur classes.
- No direct database, tRPC, or AI calls in components. Use hooks from `@/lib/hooks/` or tRPC query hooks via `@/lib/trpc`.
- Loading states must be descriptive ("Brainstorming dinners...", "Merging your grocery list..."), never generic spinners.
- Error states must have fallback UI with a retry action, not blank screens.
- All interactive elements need aria labels. All images need alt text.
- Prefer composition over configuration. Small focused components > large configurable ones.

## ⚠️ Accessible names come from TEXT NODES, never from interpolated attributes (BUG-060)

**Never write `aria-label={`Check off ${item.name}`}`.** Name a control from its own text content, or
with `aria-labelledby` pointing at the element that already renders the name. Where a verb is needed on an
icon-only control, put the verb in an `sr-only` **span** and reference it — static copy is safe.

**Why, and it is not an accessibility argument.** Session-replay masking runs through
`session_recording.maskTextFn`, and rrweb calls that for **text nodes only**. **Attributes are recorded
verbatim, and the installed rrweb build exposes no attribute hook at all** — measured against
`node_modules/posthog-js/dist/rrweb.d.ts`. There is no central place to scrub it either: posthog-js
compresses each snapshot item inside the lazily-loaded recorder bundle, *before* `before_send` runs. So a
templated `aria-label` is the one route by which household content reaches a recording in the clear, and no
configuration can close it.

⚠️ **The rule directly above this section is what produced the bug.** "All interactive elements need aria
labels" is correct, and the natural way to satisfy it put the grocery list, the week's meal titles, the
recipe library and the user's **dietary constraints** into session replay while every visible string beside
them was correctly masked. The accessibility rule and the privacy posture were in direct conflict and
nothing in the repo could see it. Deriving the name from visible text satisfies both, and is what WCAG
2.5.3 ("Label in Name") asks for anyway.

Enforced by `src/lib/analytics/aria-leak.test.ts`, which scans `src/` and fails on any dynamic
`aria-label` that is not on an allow-list carrying its reason. A value that is **app vocabulary** (tab
names, aisle categories, "Adults"/"Children") is fine and belongs on that list; a value that is **household
content** never is.
