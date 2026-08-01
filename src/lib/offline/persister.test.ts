import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import superjson from "superjson";
import { shouldDehydrateQuery, shouldDehydrateMutation, OFFLINE_MAX_AGE_MS } from "./persister";
import type { Query } from "@tanstack/react-query";

/**
 * Drops `//` and block comments so a guard reads CODE rather than the prose
 * that explains it. Without this, a comment naming the thing it forbids fails
 * the check it documents — which is how `palette.test.ts` and
 * `caps-rungs.test.ts` both first went red.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// Shapes just enough of a Query for the predicate under test.
function query(queryKey: unknown[], status = "success"): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe("offline persistence — what survives a cold launch", () => {
  it("should persist the grocery list, which is the whole point of the feature", () => {
    expect(shouldDehydrateQuery(query([["grocery", "current"], { type: "query" }]))).toBe(true);
    expect(shouldDehydrateQuery(query([["staples", "list"]]))).toBe(true);
  });

  // ⚠️ The allow-list is the security property, not a tidiness one. Persisting
  // the whole cache is ONE LINE SHORTER and writes the chef's memories about the
  // household, the onboarding health answers, children's ages and every recipe
  // to unencrypted on-device storage. BUG-018's argument: a deny-list fails
  // open — add a router tomorrow and it is persisted silently.
  it("should NOT persist anything outside the agreed offline scope", () => {
    expect(shouldDehydrateQuery(query([["user", "memories"]]))).toBe(false);
    expect(shouldDehydrateQuery(query([["user", "preferences"]]))).toBe(false);
    expect(shouldDehydrateQuery(query([["plan", "current"]]))).toBe(false);
    expect(shouldDehydrateQuery(query([["recipe", "list"]]))).toBe(false);
  });

  it("should not persist a failed query — that replays a failure into a shop", () => {
    expect(shouldDehydrateQuery(query([["grocery", "current"]], "error"))).toBe(false);
    expect(shouldDehydrateQuery(query([["grocery", "current"]], "pending"))).toBe(false);
  });

  it("should outlive a shopping trip", () => {
    // The list is a weekly object; a five-minute default would make the offline
    // read useless by the time you reached the shop.
    expect(OFFLINE_MAX_AGE_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });
});

describe("offline persistence — the queued check-off", () => {
  const paused = (key: unknown[], isPaused = true) =>
    ({ state: { isPaused }, options: { mutationKey: key } }) as never;

  it("should persist a paused check-off so it can be replayed after a cold start", () => {
    expect(shouldDehydrateMutation(paused([["grocery", "checkItem"]]))).toBe(true);
  });

  it("should not persist a mutation that is merely in flight", () => {
    expect(shouldDehydrateMutation(paused([["grocery", "checkItem"]], false))).toBe(false);
  });

  // ⚠️ A persisted mutation with no registered `mutationFn` resumes into
  // `undefined` and dies silently. Anything on this list MUST also be in
  // `registerOfflineMutationDefaults`, so the list stays narrow on purpose.
  it("should not persist a mutation we have no way to replay", () => {
    expect(shouldDehydrateMutation(paused([["grocery", "addItem"]]))).toBe(false);
    expect(shouldDehydrateMutation(paused([["plan", "confirm"]]))).toBe(false);
    expect(shouldDehydrateMutation(paused([]))).toBe(false);
  });

  it("should register a replay mutationFn for every mutation it persists", () => {
    // Source-scraped rather than retyped (this repo's idiom — `config.test.ts`
    // scrapes maxDuration, `palette.test.ts` scrapes hexes). The two lists
    // drifting apart is the exact failure that loses a tick silently.
    const src = readFileSync(join(__dirname, "persister.ts"), "utf8");
    const persisted = [...src.matchAll(/^\s*\["(\w+)", "(\w+)"\],$/gm)].map((m) => `${m[1]}.${m[2]}`);
    expect(persisted.length).toBeGreaterThan(0);
    for (const path of persisted) {
      const [router, procedure] = path.split(".");
      expect(
        src,
        `${path} is persisted but has no replay mutationFn — it will resume into undefined`
      ).toContain(`trpcClient.${router}.${procedure}.mutate`);
    }
  });
});

// ⚠️ THE SILENT ONE. `grocery.current` returns Drizzle rows whose `createdAt`
// and `updatedAt` are real Date objects — which is why the tRPC client already
// transports them through superjson. Persist with JSON and they come back as
// STRINGS, so a hydrated list is a different TYPE from a fetched one. Nothing
// throws at write time; it throws later, offline, on a phone, at `.getTime()`.
describe("offline persistence — serialization", () => {
  it("should round-trip Date objects, which JSON.stringify silently cannot", () => {
    const cache = { items: [{ id: "a", createdAt: new Date("2026-08-01T12:00:00Z") }] };

    const viaJson = JSON.parse(JSON.stringify(cache));
    expect(viaJson.items[0].createdAt, "the bug this guards").toBeTypeOf("string");

    const viaSuperjson = superjson.parse<typeof cache>(superjson.stringify(cache));
    expect(viaSuperjson.items[0].createdAt).toBeInstanceOf(Date);
    expect(viaSuperjson.items[0].createdAt.getTime()).toBe(cache.items[0].createdAt.getTime());
  });

  it("should use superjson in the persister, not JSON", () => {
    const src = readFileSync(join(__dirname, "persister.ts"), "utf8");
    expect(src).toContain("superjson.stringify");
    expect(src).toContain("superjson.parse");
    // ⚠️ Comments stripped first, because this file's own prose explains the
    // bug by naming the call it forbids — and the guard cannot tell an
    // explanation from an offence. `palette.test.ts` and `caps-rungs.test.ts`
    // each learned this the same way, by failing against themselves.
    expect(stripComments(src), "this would silently downgrade every Date").not.toMatch(
      /JSON\.(stringify|parse)/
    );
  });
});
