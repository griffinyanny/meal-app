---
description: Run the full quality gauntlet before committing -- manual dry-run
---

Run all quality checks in sequence. Stop at the first failure and report clearly.

1. **Lint:** `npx eslint --max-warnings 0 .`
2. **Type check:** `npx tsc --noEmit`
3. **Tests:** `npx vitest --run`
4. **File size check:** Find all non-test .ts/.tsx files over 300 lines:
   `find src -type f \( -name "*.tsx" -o -name "*.ts" \) ! -name "*.test.*" -exec awk 'END{if(NR>300) print FILENAME": "NR" lines"}' {} \;`
5. **Security spot check:**
   - `grep -rn "SUPABASE_SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx"` (should find 0 results in client-side code under src/components/ or src/app/)
   - `grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx"` (flag any occurrences)
   - `grep -rn "as any\|@ts-ignore\|@ts-nocheck" src/ --include="*.ts" --include="*.tsx"` (should find 0)

Report results as:
- PASS items with checkmarks
- FAIL items with X and the specific error
- Summary: "Ready to commit" or "Fix N issues before committing"
