---
globs: src/**/*.test.ts, src/**/*.test.tsx
---

# Test File Rules

- Test file lives next to the file it tests (co-located, not in a separate `__tests__/` directory).
- Descriptive test names that read as sentences: "should return empty array when no recipes exist".
- Arrange-Act-Assert pattern. One assertion concept per test.
- AI pipeline tests must cover: valid response, malformed response, timeout/error.
- tRPC procedure tests must verify auth middleware (unauthorized request should fail).
- No mocking of internal functions. Mock external boundaries only (LLM providers, Supabase client).
- System prompt snapshot tests: use Vitest inline snapshots to flag prompt changes for deliberate review.
- Use `describe` blocks to group related tests. Keep test files under 300 lines; split into multiple test files if needed.
