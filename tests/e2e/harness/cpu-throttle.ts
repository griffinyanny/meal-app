// GENERIC harness utility — copyable to any Chromium-based Playwright suite.
//
// A CPU dial, over CDP. `Emulation.setCPUThrottlingRate` is the same channel the
// capture runner already uses to clear IndexedDB (`capture-runtime.ts`), so this
// is an established pattern here rather than a new dependency.
//
// ⚠️ WHY THIS EXISTS. BUG-058's X6 fails in the full suite and passes in
// isolation, and every attempt to pin it has been a coin flip: the trigger is
// UNCONTROLLED LOAD, so a pass proves nothing and a failure cannot be reproduced.
// Turning load into a dial is what makes the three outcomes decidable —
// "fails at 4x" is a product bug on a phone, "passes at 4x and dies only under
// absurd contention" is a test artifact, and either is a resolution.
//
// Rate is read from the environment, never hard-coded into a spec, so the same
// build runs every leg. That matters twice: it keeps `E2E_REUSE_BUILD=1` honest
// between legs (S54 — never verify an edit against a reused build), and it means
// nothing has to be edited back out when the question is answered.
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** `1` = no throttling, which is what an unset environment must mean. */
export const CPU_THROTTLE_ENV = "E2E_CPU_THROTTLE";

export function cpuThrottleRate(fallback = 1): number {
  const raw = process.env[CPU_THROTTLE_ENV];
  if (!raw) return fallback;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 1) {
    throw new Error(
      `${CPU_THROTTLE_ENV} must be a number >= 1 (1 = no throttling); got ${JSON.stringify(raw)}`
    );
  }
  return rate;
}

// A CPU-bound loop with a returned sink, so the optimiser cannot delete it.
// Sized to run in tens of milliseconds at 1x — long enough that the ratio below
// is signal rather than timer noise, short enough to be free at 6x.
async function measureBusyLoopMs(page: Page): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const ms = await page.evaluate(() => {
      const started = performance.now();
      let sink = 0;
      for (let n = 1; n < 3_000_000; n++) sink += Math.sqrt(n);
      const elapsed = performance.now() - started;
      return elapsed + (sink === Infinity ? 1 : 0);
    });
    samples.push(ms);
  }
  // Min, not mean: a GC pause inflates a sample but nothing deflates one.
  return Math.min(...samples);
}

export interface CPUThrottleHandle {
  /** Re-measure and fail if the page is no longer actually throttled. */
  assertStillActive: () => Promise<void>;
  /** Return the page to full speed and detach the session. */
  restore: () => Promise<void>;
}

/**
 * Throttle the page's CPU and PROVE the throttle took effect.
 *
 * `restore()` is hygiene, not a leak guard: Playwright's default `page` fixture
 * is per-test on a fresh context, so a throttled target dies with the test that
 * set it. It matters for a caller that drives ONE page through many states — the
 * capture runner does exactly that — where an unrestored rate would silently
 * slow every state after it.
 *
 * ⚠️ The verification is the point, not ceremony. `setCPUThrottlingRate`
 * resolves without complaint on a session that is detached or a browser that
 * ignores it, so an unverified dial can be a NO-OP that still lets a spec report
 * "passed at 4x" — the false green this project has now produced four distinct
 * ways (see whats-next.md). We measure the same loop before and after and fail
 * if the page did not actually get slower.
 *
 * ⚠️ And that check is not sufficient on its own. The dial gets set BEFORE the
 * navigation under test (the failure is in the load, so throttling after `goto`
 * would miss the window entirely), which means it is verified on `about:blank`
 * and then has to survive a cross-origin navigation that Chromium may serve from
 * a different renderer process. If it silently reset there, X6 would pass at 4x
 * having never been slow — and we would close BUG-058 as a test artifact on a
 * measurement that never happened. Hence `assertStillActive`, to be called AFTER
 * the assertions so the re-measurement cannot perturb the window it is grading.
 */
export async function throttleCPU(
  page: Page,
  rate: number
): Promise<CPUThrottleHandle> {
  if (rate === 1) {
    return { assertStillActive: async () => {}, restore: async () => {} };
  }

  const baselineMs = await measureBusyLoopMs(page);
  // Guard the guard: if the baseline is ~0 the ratio below is noise and the
  // assertion passes vacuously no matter what the dial did.
  expect(
    baselineMs,
    "CPU calibration loop was too fast to measure a slowdown against — the throttle check would be vacuous"
  ).toBeGreaterThan(2);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });

  // Half the requested factor is a deliberately loose floor: this asserts the
  // dial is CONNECTED, not that the emulation is precise. A no-op reads ~1.0 and
  // cannot clear it at any rate we would use.
  const assertSlow = async (when: string) => {
    const throttledMs = await measureBusyLoopMs(page);
    const observed = throttledMs / baselineMs;
    console.log(
      `[cpu-throttle] ${when}: ${rate}x requested, ${observed.toFixed(2)}x measured ` +
        `(${baselineMs.toFixed(1)}ms → ${throttledMs.toFixed(1)}ms)`
    );
    expect(
      observed,
      `CPU throttling was not in effect ${when}: asked for ${rate}x, measured ` +
        `${observed.toFixed(2)}x (${baselineMs.toFixed(1)}ms → ${throttledMs.toFixed(1)}ms)`
    ).toBeGreaterThan(rate / 2);
  };

  await assertSlow("on apply");

  return {
    assertStillActive: () => assertSlow("after the navigation under test"),
    // ⚠️ Teardown must NEVER throw, and this is not hypothetical. When X6 failed
    // at 4x against the pre-fix code, the real error — `Send to chef` disabled
    // on an empty field — was REPLACED in the report by
    // `cdpSession.detach: Target page, context or browser has been closed`,
    // because Playwright had already torn the context down by the time this ran.
    // A cleanup error that buries the failure it is cleaning up after is a
    // failure list pointing at the wrong file (S59), and here it pointed at the
    // instrument instead of the defect.
    restore: async () => {
      try {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      } catch {
        // The page is already gone; the throttle died with its target.
      }
      try {
        await cdp.detach();
      } catch {
        // Same — nothing left to detach from.
      }
    },
  };
}

/** Scoped form: throttle, run, verify it held, always restore. */
export async function withCPUThrottle<T>(
  page: Page,
  rate: number,
  fn: () => Promise<T>
): Promise<T> {
  const throttle = await throttleCPU(page, rate);
  try {
    const result = await fn();
    await throttle.assertStillActive();
    return result;
  } finally {
    await throttle.restore();
  }
}
