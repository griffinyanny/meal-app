// GENERIC harness utility — copyable to any mobile-first Next.js app.
// Produces a Playwright config with the conventions this harness relies on: a
// dependency-ordered setup project, a mobile-Chromium test project reusing a
// minted storageState, and a self-owned dev server that is NEVER reused (so a
// stray real-AI server can't be picked up and burn tokens).
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

export interface BaseE2EOptions {
  /** Dedicated port for this app's E2E server (avoid dev/other apps). */
  port: number;
  testDir: string;
  storageStatePath: string;
  /** Command that starts the app in test mode (mock flag lives in env below). */
  webServerCommand: string;
  webServerEnv?: Record<string, string>;
}

export function baseE2EConfig(opts: BaseE2EOptions): PlaywrightTestConfig {
  const baseURL = `http://localhost:${opts.port}`;
  return defineConfig({
    testDir: opts.testDir,
    // One shared test household → run serially. Flakes must surface, not be
    // retried away; this suite's job is to find real bugs.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
      baseURL,
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      navigationTimeout: 30_000,
      // Mobile-first emulation on Chromium (isMobile needs Chromium). Matches
      // the app's 430px max-width, bottom-drawer, touch UI.
      browserName: "chromium",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
    projects: [
      { name: "setup", testMatch: /.*\.setup\.ts/ },
      {
        name: "mobile-chromium",
        dependencies: ["setup"],
        // Specs are `.spec.ts` by convention here (captures carry their own
        // configs with their own testMatch). Stated rather than left to
        // Playwright's default, which also collects `*.test.ts` — so a vitest
        // file co-located with a harness helper would be picked up by BOTH
        // runners and fail under this one.
        testMatch: /\.spec\.ts$/,
        use: { storageState: opts.storageStatePath },
      },
    ],
    webServer: {
      command: opts.webServerCommand,
      url: `${baseURL}/login`,
      env: opts.webServerEnv,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  });
}
