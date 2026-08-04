import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ⚠️ BUG-061 · `E2E_REUSE_BUILD=1` DEFEATS THE ANALYTICS-OFF PIN, AND NOTHING
 * COULD SEE IT.
 *
 * Every suite config pins `NEXT_PUBLIC_POSTHOG_KEY: ""` in `webServerEnv`, and
 * `playwright.config.ts`'s own comment states the premise that makes it work:
 * *"`NEXT_PUBLIC_*` is inlined at BUILD time, and the build runs inside
 * `webServerCommand` with this env."*
 *
 * `E2E_REUSE_BUILD=1` removes exactly that premise. It swaps
 * `npm run build && npm run start` for `npm run start`, so the pin applies to a
 * build that never happens and the server boots the `.next` sitting on disk —
 * whatever key THAT was built with. Since S64 put a real `phc_` key in
 * `.env.local`, an ordinary `npm run build` produces a build that reports to
 * PostHog, and reusing it fires 143 specs of fabricated rituals, plan
 * generations and grocery lists into the project the DoD's time-to-list number
 * is read from.
 *
 * `analytics-config.test.ts` cannot catch this: the pinned line is still there,
 * still correct, still in `webServerEnv`. The config is not what changed — the
 * build is. So this guard reads THE BUILT ARTIFACT, which is the only place the
 * answer exists, and is the same move as S64's `assertDecoded`: before trusting
 * a value, prove you are looking at the thing that carries it.
 *
 * Not a lint rule and not a comment in the README, because the README already
 * recommended reuse as a plain speed optimisation for four sessions.
 */

/** PostHog project keys are `phc_` followed by a long base62 body. */
const POSTHOG_KEY = /phc_[A-Za-z0-9]{20,}/;

interface ScanResult {
  filesScanned: number;
  bytesScanned: number;
  offender: string | null;
}

function scan(dir: string): ScanResult {
  const result: ScanResult = { filesScanned: 0, bytesScanned: 0, offender: null };

  const walk = (current: string) => {
    if (result.offender) return;
    for (const entry of readdirSync(current)) {
      if (result.offender) return;
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".js")) continue;
      const body = readFileSync(full, "utf8");
      result.filesScanned += 1;
      result.bytesScanned += body.length;
      if (POSTHOG_KEY.test(body)) result.offender = full;
    }
  };

  walk(dir);
  return result;
}

/**
 * Refuses a reused build that carries a real analytics key. No-op unless
 * `E2E_REUSE_BUILD=1`, so a normal run pays nothing.
 */
export function assertReusedBuildIsClean(): void {
  if (process.env.E2E_REUSE_BUILD !== "1") return;

  const chunks = join(process.cwd(), ".next", "static", "chunks");

  // Reuse requested with nothing to reuse. `next start` would fail a minute
  // later with a less obvious message, so say it here.
  if (!existsSync(chunks)) {
    throw new Error(
      "E2E_REUSE_BUILD=1 but there is no build at .next/static/chunks. " +
        "Run the suite without the flag, or `npm run build` first."
    );
  }

  const { filesScanned, bytesScanned, offender } = scan(chunks);

  // ⚠️ A scan that read nothing reports "clean" and is indistinguishable from a
  // scan that read everything. Prove the measurement happened before trusting
  // its result — S64's lesson, which arrived because a leak check searched a
  // gzipped body and found nothing whether or not it had leaked.
  if (filesScanned === 0 || bytesScanned === 0) {
    throw new Error(
      `The reused-build analytics guard scanned ${filesScanned} files / ` +
        `${bytesScanned} bytes under ${chunks} — it read nothing, so its ` +
        "verdict is meaningless. Fix the guard rather than the flag."
    );
  }

  if (offender) {
    throw new Error(
      "⚠️ REFUSING TO REUSE THIS BUILD — it carries a real PostHog key.\n\n" +
        `  found in: ${offender}\n\n` +
        "`NEXT_PUBLIC_*` is inlined at BUILD time. The suite configs pin\n" +
        "`NEXT_PUBLIC_POSTHOG_KEY: \"\"` in `webServerEnv`, but E2E_REUSE_BUILD=1\n" +
        "skips the build that pin applies to, so this run would boot a build made\n" +
        "from `.env.local` and report every spec to PostHog as real usage —\n" +
        "landing in the DoD's time-to-list measurement as data, and burning\n" +
        "session-replay quota on a robot.\n\n" +
        "Re-run without E2E_REUSE_BUILD=1. (BUG-061)"
    );
  }
}
