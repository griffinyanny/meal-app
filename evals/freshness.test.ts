// Runs in the normal (free, offline) commit gauntlet, NOT in the eval suite.
//
// Its whole job is to make one specific kind of rot impossible: committed eval
// results that describe prompts the repo no longer has. Editing a prompt without
// re-running the evals leaves RESULTS.md quietly asserting numbers about code
// that is gone, and nothing else in the repo can see that.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promptFingerprint, recordedFingerprint } from "./harness/fingerprint";

const RESULTS = path.resolve(__dirname, "RESULTS.md");

describe("eval freshness", () => {
  it("fingerprints the prompt and task sources", () => {
    const fingerprint = promptFingerprint();
    expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);
    // Stable across calls, or it could never detect anything.
    expect(promptFingerprint()).toBe(fingerprint);
  });

  it("has committed results describing the prompts currently in the repo", () => {
    if (!existsSync(RESULTS)) {
      // Before the first run there is nothing to be stale. Once RESULTS.md
      // exists this branch never runs again.
      return;
    }

    const recorded = recordedFingerprint(readFileSync(RESULTS, "utf8"));
    expect(
      recorded,
      "evals/RESULTS.md has no prompt fingerprint — regenerate it with `npm run eval:report`"
    ).not.toBeNull();

    expect(
      recorded,
      [
        "The AI prompts or task pipelines changed since the committed eval results were produced,",
        "so the numbers in evals/RESULTS.md describe code that no longer exists.",
        "",
        "Run `npm run eval` (real model, a few minutes, under a dollar) and commit the updated",
        "evals/RESULTS.md with this change.",
      ].join("\n")
    ).toBe(promptFingerprint());
  });
});
