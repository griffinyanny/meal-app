import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A guard for `public/sw.js` (1F/C).
//
// ⚠️ WHY THIS FILE IS SOURCE-SCRAPED AND NOT IMPORTED. `sw.js` runs in a
// ServiceWorkerGlobalScope — it references `self`, `caches` and `clients`, none
// of which exist in vitest, and standing up a fake ServiceWorkerGlobalScope
// would be testing the fake. What matters here is not that the code runs; it is
// that a specific set of rules is PRESENT, because getting them wrong ships a
// permanently broken app to a phone we cannot reach. Same idiom as
// `config.test.ts` scraping `maxDuration` out of route source.
//
// The behavioural half — does an offline reload actually paint the app — is
// `tests/e2e/specs/offline.spec.ts`, which drives a real service worker in a
// real browser. Neither layer replaces the other.

const SW = join(process.cwd(), "public", "sw.js");
let src: string;

beforeAll(() => {
  src = readFileSync(SW, "utf8");
});

describe("service worker — the rules that keep it from bricking the app", () => {
  // ⚠️ THE ONE THAT MATTERS MOST. S59 shipped two bugs whose shape was "a
  // request that looks signed-out gets redirected, and the redirect is
  // indistinguishable from the real thing". A service worker turns that from a
  // bad response into a PERSISTED bad response: cache a 307-to-/login under the
  // /plan key and the installed app is pinned to a login screen forever, with no
  // address bar to escape it and no deploy that clears it.
  //
  // `res.redirected` is the only property that distinguishes "the page you
  // asked for" from "the page you were sent to". Removing this check is the
  // single most expensive one-line edit available in this repo.
  it("should refuse to cache a response that came from a redirect", () => {
    expect(src, "a cached 307-to-/login pins the installed app to the login screen").toMatch(
      /!\s*res(ponse)?\.redirected/
    );
  });

  it("should only cache successful, same-origin responses", () => {
    expect(src).toMatch(/res(ponse)?\.ok/);
    expect(src).toMatch(/res(ponse)?\.type\s*===\s*["']basic["']/);
  });

  // Every auth path, independently of the redirect check above. Two guards
  // rather than one because this is the failure that has already happened twice
  // in this codebase, both times found by hitting a live URL rather than by any
  // test.
  it("should never cache an auth path", () => {
    // The list lives as regex literals, so the slashes arrive escaped
    // (`/^\/api\//`). Unescape before comparing rather than asserting on the
    // escaping, which is an implementation detail of how the list is written.
    const unescaped = src.replace(/\\\//g, "/");
    for (const path of ["/api/", "/auth/", "/login", "/invite", "/no-access"]) {
      expect(unescaped, `${path} must be in NEVER_CACHE`).toContain(path);
    }
  });

  // tRPC batches over POST and `Cache.put` rejects non-GET outright. If this
  // guard disappears the worker starts throwing on every mutation.
  it("should hand every non-GET straight to the network", () => {
    expect(src).toMatch(/request\.method\s*!==\s*["']GET["']/);
  });

  it("should clean up caches it no longer owns, so storage cannot grow forever", () => {
    expect(src).toContain("caches.delete");
    expect(src).toMatch(/caches\.keys/);
  });

  // The sign-out path in `persister.ts` posts this exact string. A rename on one
  // side leaves the other silently doing nothing, and what it silently stops
  // doing is clearing one household's rendered week off a shared device.
  it("should expose the clear-caches message the sign-out path sends", () => {
    expect(src).toContain("clear-caches");
    const persister = readFileSync(join(process.cwd(), "src/lib/offline/persister.ts"), "utf8");
    expect(persister, "sign-out must post the message sw.js listens for").toContain(
      'postMessage("clear-caches")'
    );
  });

  // ⚠️ A worker does not control the page that registers it — that navigation
  // is already in flight — so the FIRST visit to a route never reaches `fetch`
  // and never gets cached. The worker then activates and reports itself healthy
  // holding nothing. In a browser tab that is invisible; in an installed PWA it
  // is the whole feature failing on the launch that matters most: install, open
  // once, walk to the shop, dead page. OF1/OF2 caught this as ERR_FAILED.
  it("should warm the shell on activate, or the first launch caches nothing", () => {
    expect(src).toContain("warmShell");
    for (const route of ["/plan", "/groceries", "/recipes", "/you"]) {
      expect(src, `${route} must be warmed`).toContain(route);
    }
    // Warming must run the same gate as everything else, so a worker that
    // activates while signed out fetches four redirects and stores none.
    const warm = src.slice(src.indexOf("async function warmShell"));
    expect(warm.slice(0, warm.indexOf("}\n\n")), "warming must not bypass isCacheable").toContain(
      "isCacheable"
    );
  });

  it("should ignore Vary when falling back to cache", () => {
    // A warmed entry is fetched as a plain GET; a reload is a navigation. Next
    // sets Vary on route responses, so a Vary-respecting match misses an entry
    // that is sitting right there — indistinguishable from an empty cache.
    expect(src).toMatch(/ignoreVary:\s*true/);
  });

  it("should not fall back to the start_url shell for an uncached route", () => {
    // Serving /plan's shell under /groceries would show the wrong screen and
    // claim it was the right one. The designed offline page is one of
    // Workstream C's four design artifacts; until it lands, an honest failure
    // beats a confident lie.
    expect(src).not.toMatch(/caches\.match\(\s*["']\/plan["']/);
  });
});

describe("service worker — registration", () => {
  const registrar = () =>
    readFileSync(join(process.cwd(), "src/components/shell/service-worker.tsx"), "utf8");

  // In `next dev` a cached shell survives hot reload, so you edit a file, see
  // nothing change, and go hunting for the bug in your own code.
  it("should register in production builds only", () => {
    expect(registrar()).toMatch(/NODE_ENV\s*!==\s*["']production["']/);
  });

  it("should degrade to no-offline rather than break the app when registration fails", () => {
    expect(registrar()).toMatch(/\.catch\(/);
  });
});
