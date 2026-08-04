import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

const CONFIGS = ["playwright.config.ts", "playwright.capture.config.ts"];

describe("analytics is disabled for every automated run", () => {
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
