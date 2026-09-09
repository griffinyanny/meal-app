import { defineConfig } from "vitest/config";
import path from "path";

// A separate vitest project for the evals, for one reason: these tests spend real
// money and take minutes, so they must never be picked up by the commit gauntlet.
// The root config's default include matches `*.test.ts`; eval cases are named
// `*.eval.ts`, which nothing else looks for, and this config is the only place
// that pattern is registered.
export default defineConfig({
  test: {
    root: __dirname,
    environment: "node",
    include: ["cases/*.eval.ts"],
    // Case files run in parallel workers, which is where the suite's concurrency
    // comes from — each file is one in-flight model call at a time, so this is
    // effectively a concurrency cap of 4 against the API.
    maxWorkers: 4,
    // Per-case timeouts are set by the runner from its own per-run budget; this
    // is only a backstop for anything that slips through.
    testTimeout: 240_000,
    hookTimeout: 60_000,
    // The whole point is watching real model behaviour, so keep the reporter
    // chatty enough to see which case is running.
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..", "src"),
    },
  },
});
