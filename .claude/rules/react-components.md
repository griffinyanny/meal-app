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
