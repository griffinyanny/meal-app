// PF — the performance half of Workstream D's "performance + a11y pass".
//
// ⚠️ WHAT THIS DELIBERATELY IS NOT. It is not Lighthouse. Lighthouse grades a
// marketing-site model — LCP on a cold static page — and every surface that
// matters here sits behind the proxy's auth gate, so the only page it could
// score is `/login`. A good number about the login screen is not a fact about
// this product.
//
// And it is not a general perf hunt. The DoD is "time-to-list < 10 minutes on a
// real week", which is HUMAN time; the machine's only job is to not feel broken
// on a phone. So this measures two things a person would actually notice, and
// one thing that silently gets worse without anyone noticing.
import { test, expect } from "@playwright/test";
import { seedPlanState, seedGroceryState, resetTestHousehold } from "../app/seed";
import { throttleCPU } from "../harness/cpu-throttle";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

test.afterAll(async () => {
  await resetTestHousehold();
});

/**
 * ⚠️ PINNED AT 4x, AND THE THROTTLE IS THE MEASUREMENT.
 *
 * The same rate `X7` uses. S65 established that this desktop at 4x is roughly a
 * phone, and — more importantly — that at 1x the class of defect being watched
 * for here DOES NOT OCCUR AT ALL. An unthrottled timing on this machine is a
 * fact about a developer's laptop, which is the one device the product will
 * never run on.
 */
const PHONE_CPU = 4;

/**
 * ⚠️ PF1 AND PF2 ARE ONLY MEANINGFUL ON A VERIFIED-IDLE MACHINE, AND THE DIAL
 * DOES NOT CHANGE THAT.
 *
 * `Emulation.setCPUThrottlingRate` slows the RENDERER only — S65's rider — so
 * it reproduces a slow phone but does nothing about the Next server, the
 * database, or anything else competing on the same box. A red here on a loaded
 * machine says "this laptop was busy", not "the app got slower", and the
 * difference is invisible in the report.
 *
 * So: `top -l 2 -n 0 | grep "CPU usage"` before trusting a PF result, the same
 * instantaneous figure the E2E rule already requires (never `uptime`'s load
 * average, which lags by minutes). If these two are red and the machine was
 * not idle, RE-RUN before believing them — and do not raise the budget, which
 * is the move that turns a real regression into a permanently green test.
 *
 * PF3 has no such caveat: it reads bytes off disk and does not care what else
 * is running.
 */

/**
 * How long a surface may take to become USABLE at phone speed. A ceiling, not
 * a target: if a change reddens one of these, the question is what got slower.
 *
 * MEASURED at 4x on an idle machine — PF1 **1840ms**, PF2 **2913ms** — and set
 * at roughly 2x the slower. The slack is deliberate and recorded rather than
 * accidental: wall-clock on a shared CPU is genuinely variable, and a timing
 * budget pinned near its own measurement is a flake generator that teaches
 * people to raise it. Writing the measurement beside the ceiling is the half
 * S59's forty-five-notch ratchet was missing.
 */
const BUDGET_MS = 6_000;

test("PF1 - the Plan intent field is usable at phone speed", async ({ page }) => {
  await seedPlanState("EMPTY");

  const throttle = await throttleCPU(page, PHONE_CPU);
  try {
    const started = Date.now();
    await page.goto("/plan");

    // ⚠️ USABLE, not painted. The assertion is that the field can be TYPED
    // INTO — `toBeVisible` would pass against a control that is on screen and
    // still disabled, which is exactly the state BUG-058 left it in. What a
    // person cares about on the north-star flow's front door is whether they
    // can start, not whether pixels arrived.
    // Addressed by placeholder, matching `X7` — the field carries no testid,
    // and inventing one here would put two ways to find the same control in
    // the suite.
    const field = page.getByPlaceholder("Or just start talking. What sounds good?");
    await expect(field).toBeEnabled({ timeout: BUDGET_MS });
    const elapsed = Date.now() - started;

    console.log(`[PF1] intent field usable at ${PHONE_CPU}x in ${elapsed}ms`);
    expect(elapsed, `the intent field took ${elapsed}ms to become usable`).toBeLessThan(
      BUDGET_MS
    );
  } finally {
    await throttle.restore();
  }
});

test("PF2 - the grocery list is readable at phone speed", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");

  const throttle = await throttleCPU(page, PHONE_CPU);
  try {
    const started = Date.now();
    await page.goto("/groceries");
    await expect(page.getByTestId("grocery-list")).toBeVisible({ timeout: BUDGET_MS });
    const elapsed = Date.now() - started;

    console.log(`[PF2] grocery list readable at ${PHONE_CPU}x in ${elapsed}ms`);
    expect(elapsed, `the grocery list took ${elapsed}ms to render`).toBeLessThan(BUDGET_MS);
  } finally {
    await throttle.restore();
  }
});

/**
 * ⚠️ THE RATCHET, AND THE ONLY ONE OF THE THREE THAT CATCHES A SLOW DRIFT.
 *
 * PF1 and PF2 catch a surface that broke. Neither catches the thing that
 * actually happens to apps: one reasonable-looking dependency at a time, until
 * the bundle has doubled and no single commit is to blame. That is exactly how
 * this project accumulated thirty type sizes (S58) and how `type-scale.test.ts`
 * came to exist — the same shape of problem, so the same shape of guard.
 *
 * Measured from the built artifact rather than reported by a plugin, for the
 * reason `assert-reused-build-is-clean.ts` reads `.next` too: the build is the
 * thing that ships.
 */
// ⚠️ MEASURED AT 2432KB across 29 chunks, ratchet set at 2700 — about 10%.
//
// This constant was 4200 when it was written, which is 73% slack, which is not
// a ratchet: it would have absorbed an entire second copy of the app without
// going red. That is S59's finding exactly — `type-scale.test.ts` shipped with
// CEILING = 71 while its own subject measured 26 — and it happened here for the
// same reason, a number typed before the thing was measured.
//
// Bundle bytes are near-deterministic between builds, so unlike the timing
// budget above this one gets very little headroom on purpose.
const JS_BUDGET_KB = 2_700;

test("PF3 - the shipped JS does not quietly grow", async () => {
  const chunks = join(process.cwd(), ".next", "static", "chunks");

  let bytes = 0;
  let files = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith(".js")) {
        bytes += stat.size;
        files += 1;
      }
    }
  };
  walk(chunks);

  // A walk that found nothing reports 0KB and passes a "must be under budget"
  // assertion perfectly — the test-that-cannot-fail, which this project has now
  // produced six ways. Prove the measurement happened first.
  expect(files, `found no .js under ${chunks} — the scan did not run`).toBeGreaterThan(10);
  expect(bytes, "the scan read no bytes").toBeGreaterThan(0);

  const kb = Math.round(bytes / 1024);
  console.log(`[PF3] shipped client JS: ${kb}KB across ${files} chunks`);

  expect(
    kb,
    `client JS is ${kb}KB, over the ${JS_BUDGET_KB}KB ratchet. This is not a ` +
      `hard failure of the product — it is the question "what did we add, and ` +
      `did we mean to?". If the growth is deliberate, raise the number in the ` +
      `same commit that causes it, so the raise is reviewable.`
  ).toBeLessThanOrEqual(JS_BUDGET_KB);
});
