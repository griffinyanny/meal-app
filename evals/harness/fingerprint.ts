// A fingerprint of everything that decides what the model is asked to do.
//
// Committed eval results describe one specific version of the prompts and task
// pipelines. Edit a prompt and the numbers in RESULTS.md quietly become a claim
// about code that no longer exists — which is the exact failure this repo has hit
// before with documents that cited artifacts they had outlived.
//
// So the fingerprint is recorded in RESULTS.md, and a free, offline test in the
// normal commit gauntlet fails when the two drift apart. It costs nothing and it
// is the only thing standing between "we have evals" and "we had evals".
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Directories whose contents define the model's instructions and output contract. */
const FINGERPRINTED = [
  path.join("src", "server", "ai", "prompts"),
  path.join("src", "server", "ai", "tasks"),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

export function promptFingerprint(): string {
  const files = FINGERPRINTED.flatMap((rel) => walk(path.join(REPO_ROOT, rel))).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(REPO_ROOT, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex").slice(0, 12);
}

/** The fingerprint RESULTS.md claims to describe, or null if it has never been generated. */
export function recordedFingerprint(resultsMarkdown: string): string | null {
  const match = /\| Prompt fingerprint \| `([0-9a-f]+)` \|/.exec(resultsMarkdown);
  return match ? match[1] : null;
}
