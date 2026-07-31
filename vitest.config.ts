import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    // Playwright's own files run under @playwright/test, not vitest, so the
    // unit gauntlet must never try to load them. Named by PATTERN rather than
    // by excluding tests/e2e wholesale, because harness helpers that are just
    // pure functions (project-guard.ts) deserve co-located unit tests and were
    // previously unreachable from either runner.
    exclude: [
      ...configDefaults.exclude,
      "tests/e2e/**/*.spec.ts",
      "tests/e2e/**/*.capture.ts",
      "tests/e2e/**/*.setup.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
