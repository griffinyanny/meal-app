import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// THE APP DOOR'S FIRST HALF, GUARDED (1F/D · S67).
//
// The RLS statement in `src/server/db/rls.test.ts` measured which layer holds
// which door: RLS holds PostgREST, and the tRPC layer holds the app's own
// connection ALONE — `rolbypassrls = true` on the role the app connects as, so
// a missing authorization check has no second layer under it.
//
// That layer is two halves: (a) every procedure is authenticated, and (b) every
// query filters by the caller's household. **Only (a) is decidable from the
// source string**, so only (a) is guarded here. (b) stays a discipline plus the
// per-router tests, deliberately: a regex deciding whether a Drizzle query is
// household-scoped mis-reports on correct code — `user-dev-tools.ts` scopes by
// `ctx.user.id` for a self-service reset and is right to — and a guard that
// cries wolf on day one teaches you to edit the expectation (S59).

const ROUTERS_DIR = __dirname;

function routerSources(): Array<{ name: string; text: string }> {
  return readdirSync(ROUTERS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".test.ts") && !f.includes("test-utils"))
    .map((name) => ({
      name,
      text: readFileSync(join(ROUTERS_DIR, name), "utf8"),
    }));
}

describe("every tRPC procedure is authenticated", () => {
  const sources = routerSources();

  // Without this, a broken scan passes the assertion below vacuously — the
  // shape of false green this project has now produced six distinct ways.
  it("actually scanned the routers", () => {
    expect(sources.length).toBeGreaterThan(8);
    expect(sources.some((s) => s.text.includes("protectedProcedure"))).toBe(true);
  });

  it("no router exposes a publicProcedure", () => {
    const offenders = sources
      .filter(({ text }) =>
        // Strip comments first: this file's own prose names the symbol, and a
        // guard that fails against a comment is the fourth instance of that in
        // this repo (palette.test.ts, caps-rungs.test.ts, type-scale.test.ts).
        text
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
          .includes("publicProcedure")
      )
      .map((s) => s.name);

    expect(
      offenders,
      `publicProcedure in: ${offenders.join(", ")}. The app connects to Postgres ` +
        `as the OWNING role with rolbypassrls=true, so RLS does not filter its ` +
        `queries — an unauthenticated procedure has nothing underneath it. If a ` +
        `genuinely public endpoint is ever needed, it belongs in a route handler ` +
        `with its own stated threat model, not in a router beside household data.`
    ).toEqual([]);
  });
});
