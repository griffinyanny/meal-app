import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ⚠️ Scrapes the Playwright configs rather than importing them, for the same
 * reason `src/server/ai/config.test.ts` scrapes `maxDuration` out of the route
 * source: importing gives you the value the test environment produces, and the
 * thing that matters is the value written in the file that ships.
 *
 * WHAT THIS PROTECTS. Analytics is enabled by the presence of
 * `NEXT_PUBLIC_POSTHOG_KEY`. That variable is inlined at BUILD time, and both
 * suites build inside their own `webServerCommand` — so without an explicit
 * empty value in `webServerEnv`, a developer with a real key in `.env.local`
 * gets a suite that reports to PostHog. 139 specs plus 55 capture states would
 * fabricate hundreds of rituals, plan generations and grocery lists, and those
 * land in the DoD's "time-to-list < 10 minutes on a REAL week" as data.
 *
 * Nothing else in the project can see that: the events would be real, the
 * numbers plausible, and the only tell is that Griffin did not do any of it.
 */
function configSource(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

/**
 * ⚠️ DERIVED FROM DISK, NOT HAND-LISTED — BUG-061.
 *
 * This was the literal pair `["playwright.config.ts", "playwright.capture.config.ts"]`,
 * and `playwright.capture-live.config.ts` had `webServerEnv: {}` with no pin at
 * all. The guard could not see the file it was missing, because the file was
 * missing from the guard. A hand-maintained list of things to check is only as
 * complete as the last person to remember it — the fourth instance in this
 * project of a layer that cannot see its own subject.
 *
 * The masking config is the ONE deliberate exception: its entire purpose is to
 * observe what a real recording contains, so it must carry a real key. It is
 * excluded BY NAME with the reason attached, because an unexplained exemption
 * outlives the reason for it (S52).
 */
const MASKING_CONFIG = "playwright.masking.config.ts";

const CONFIGS = readdirSync(process.cwd())
  .filter((f) => /^playwright\..*config\.ts$/.test(f) || f === "playwright.config.ts")
  .filter((f) => f !== MASKING_CONFIG)
  .sort();

describe("analytics is disabled for every automated run", () => {
  // Without this, a glob that matched nothing would pass every assertion below
  // vacuously — the shape of failure this project has now produced five ways.
  it("actually found the Playwright configs to check", () => {
    expect(CONFIGS.length).toBeGreaterThanOrEqual(3);
    expect(CONFIGS).toContain("playwright.config.ts");
    expect(CONFIGS).toContain("playwright.capture.config.ts");
    expect(CONFIGS).toContain("playwright.capture-live.config.ts");
    expect(CONFIGS).not.toContain(MASKING_CONFIG);
  });

  for (const file of CONFIGS) {
    it(`${file} pins NEXT_PUBLIC_POSTHOG_KEY to empty in webServerEnv`, () => {
      const source = configSource(file);

      expect(source).toMatch(/NEXT_PUBLIC_POSTHOG_KEY:\s*""/);

      // And it must be inside `webServerEnv`, not merely present in a comment
      // or set on a project's `use` block where the build never sees it.
      const envBlock = source.slice(source.indexOf("webServerEnv"));
      expect(envBlock).toMatch(/NEXT_PUBLIC_POSTHOG_KEY:\s*""/);
    });
  }

  it("never pins it to a non-empty value", () => {
    for (const file of CONFIGS) {
      expect(configSource(file)).not.toMatch(
        /NEXT_PUBLIC_POSTHOG_KEY:\s*"(?!")/
      );
    }
  });

  // The env file is how a new machine learns the variable exists at all — and
  // `reference_env_secrets` says these get recreated by hand on every machine.
  it("documents the analytics variables in .env.example", () => {
    const example = configSource(".env.example");
    expect(example).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(example).toContain("SENTRY_DSN");
  });
});
