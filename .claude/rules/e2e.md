---
globs: src/components/plan/**/*.tsx, src/components/groceries/**/*.tsx, src/components/recipes/**/*.tsx, src/components/you/**/*.tsx, src/components/onboarding/**/*.tsx, src/components/shared/**/*.tsx, src/components/shell/**/*.tsx, src/components/ui/drawer.tsx, src/app/api/plan/**/*.ts, src/server/trpc/routers/plan*.ts, src/server/trpc/routers/grocery*.ts, src/server/trpc/routers/recipe*.ts, src/server/trpc/routers/staples.ts, src/server/trpc/routers/memory.ts, src/server/trpc/routers/user*.ts, src/lib/onboarding/**/*.ts, src/server/ai/providers/e2e-fixtures/**/*.ts, tests/e2e/**/*.ts
---

# E2E rule

You are editing code the Playwright E2E suite covers. Coverage today: **Plan,
Groceries, Recipes, You, onboarding, and the PWA's offline half** (**143 specs**, S65).
Before wrapping:

⚠️ **CHECK THE MACHINE BEFORE TRUSTING A FULL-SUITE RESULT.** `top -l 2 -n 0 | grep "CPU usage"` — the
**instantaneous** idle figure, NOT `uptime`'s load average, which lags by minutes and will show a number
from work that has already finished. S64 spent a session diagnosing a "product bug" that was `vitest`,
`lint` and `typecheck` running concurrently INSIDE the 20-minute run, and S65 found an unrelated project's
`next dev` holding **123% CPU** on a 4-physical-core box. **S53's "never run two suites at once" is not
only about Playwright** — it is about anything that competes for the CPU, including the gauntlet.

⚠️ **A LOAD-SENSITIVE FAILURE NEEDS A LOAD KNOB, NOT ANOTHER THEORY.**
`tests/e2e/harness/cpu-throttle.ts` throttles the page over CDP; rate comes from `E2E_CPU_THROTTLE` so every
leg runs the same build. Use it when a spec passes in isolation and fails in the full run: a pass under
uncontrolled load proves nothing, and a failure cannot be reproduced. **A green run cannot distinguish *the
bug is gone* from *the trigger did not fire*.** ⚠️ It slows the **RENDERER only**, not the Next server on the
same box — it reproduces a slow phone, not a loaded machine. ⚠️ And it **verifies itself**: an unthrottled
dial is a no-op that would still let a spec report "passed at 4x".
⚠️ **`X7` is pinned at 4x and the throttle IS the test** — at 1x its defect (BUG-058) does not occur at all,
and X7 passes against the pre-fix code. Do not remove the throttle to speed the suite up.

⚠️ **Never pipe the run through `tail`, `head`, or a trailing `echo`.** The
harness reports the LAST command's exit code, so a failing suite comes back as
exit 0 — S55 (pipe), S56 (trailing command), S57 (wrong directory) and **S60
(pipe again)**. **Read the summary line, never the status.**

⚠️ **And do NOT redirect into `test-results/` — Playwright WIPES that directory
at startup.** S61: an 18-minute run wrote its whole log into a deleted file
descriptor and produced no readable output at all. **The safe shape is
`run_in_background: true` with NO redirect**, then read the summary line out of
the task's own output file. That also avoids the trailing-command trap above,
because there is no trailing command.

- **Run `npm run test:e2e`** (self-contained: builds + starts its own server on 3102, deterministic AI mock, no OpenAI spend). After a build, `E2E_REUSE_BUILD=1 npm run test:e2e` skips the rebuild.
- **Extend the specs** in `tests/e2e/specs/` for any new behavior on a covered tab — a feature isn't done until its mechanics are covered. `docs/test-plan.md` is the 1:1 catalog.
- If a spec surfaces a real product question (not a bug), mark it `test.fixme` with a comment and flag Griffin — do NOT weaken the assertion to force green.
- **Editing `src/server/ai/providers/e2e-fixtures/`?** That is the seam the entire suite rides on, and drift there is silent: a fixture that no longer resembles what the real model returns makes the suite green against a lie, and no amount of mock testing can catch it. Say so at wrap and schedule a **Layer B** (real-model) capture for the affected tab — see `docs/test-plan.md` → "Layer-B cadence".
- When the mechanics pass, tell Griffin the feature is machine-verified and ready for his **taste** review (reads well? chips sound like imperatives? feels right?) — don't hand him a full click script.

Full context: `tests/e2e/harness/README.md` and CLAUDE.md → "E2E test suite".
