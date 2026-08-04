import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ACCESS_COOKIE,
  codesMatch,
  isEmailAllowed,
  parseEmailList,
  isSignedOutReachable,
  shouldBlockRequest,
  siteAccessCode,
} from "./access";

const originalCode = process.env.SITE_ACCESS_CODE;
const originalAllowed = process.env.ALLOWED_EMAILS;

beforeEach(() => {
  delete process.env.SITE_ACCESS_CODE;
  delete process.env.ALLOWED_EMAILS;
});

afterEach(() => {
  if (originalCode === undefined) delete process.env.SITE_ACCESS_CODE;
  else process.env.SITE_ACCESS_CODE = originalCode;
  if (originalAllowed === undefined) delete process.env.ALLOWED_EMAILS;
  else process.env.ALLOWED_EMAILS = originalAllowed;
});

describe("parseEmailList", () => {
  it("should return an empty array when the value is undefined", () => {
    expect(parseEmailList(undefined)).toEqual([]);
  });

  it("should return an empty array for an empty or comma-only string", () => {
    expect(parseEmailList("")).toEqual([]);
    expect(parseEmailList(" , , ")).toEqual([]);
  });

  it("should trim and lowercase every entry", () => {
    expect(parseEmailList(" A@Example.com , B@Example.COM ")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });
});

describe("siteAccessCode", () => {
  it("should return null when the variable is unset", () => {
    expect(siteAccessCode()).toBeNull();
  });

  it("should return null when the variable is only whitespace", () => {
    process.env.SITE_ACCESS_CODE = "   ";
    expect(siteAccessCode()).toBeNull();
  });

  it("should return the trimmed code when set", () => {
    process.env.SITE_ACCESS_CODE = " secret ";
    expect(siteAccessCode()).toBe("secret");
  });
});

describe("codesMatch", () => {
  it("should match identical codes", () => {
    expect(codesMatch("abc123", "abc123")).toBe(true);
  });

  it("should reject a different code of the same length", () => {
    expect(codesMatch("abc123", "abc124")).toBe(false);
  });

  it("should reject a differing length without throwing", () => {
    expect(codesMatch("abc", "abc123")).toBe(false);
  });

  it("should reject null, undefined, and empty values", () => {
    expect(codesMatch(null, "abc")).toBe(false);
    expect(codesMatch("abc", undefined)).toBe(false);
    expect(codesMatch("", "")).toBe(false);
  });
});

describe("shouldBlockRequest", () => {
  it("should never block when no code is configured", () => {
    expect(shouldBlockRequest("/you", undefined, null)).toBe(false);
    expect(shouldBlockRequest("/login", undefined, null)).toBe(false);
  });

  it("should block an app path when the cookie is absent", () => {
    expect(shouldBlockRequest("/you", undefined, "secret")).toBe(true);
  });

  it("should block the login screen itself, which is the whole point", () => {
    expect(shouldBlockRequest("/login", undefined, "secret")).toBe(true);
  });

  it("should block when the cookie holds the wrong code", () => {
    expect(shouldBlockRequest("/you", "wrong", "secret")).toBe(true);
  });

  it("should allow any path once the cookie holds the right code", () => {
    expect(shouldBlockRequest("/you", "secret", "secret")).toBe(false);
    expect(shouldBlockRequest("/api/trpc/user.me", "secret", "secret")).toBe(false);
  });

  it("should always exempt /invite, the only way to obtain the cookie", () => {
    expect(shouldBlockRequest("/invite", undefined, "secret")).toBe(false);
  });

  it("should always exempt /no-access so a rejected user can be told why", () => {
    expect(shouldBlockRequest("/no-access", undefined, "secret")).toBe(false);
  });

  it("should reach the manifest without a session, or the app installs as a bookmark", () => {
    // ⚠️ TWO gates, and exempting a path from one does not exempt it from the
    // other. S59 shipped the manifest exempt from gate 1 and it was STILL
    // broken in production, 307'd to /login by the session check below it —
    // found by curling the live URL, not by any test.
    //
    // This one bites hardest because **a browser fetches a manifest with
    // `credentials: "omit"`**: the request always looks signed-out, so the
    // redirect fires even for a signed-in user on their own phone. Safari then
    // parses the /login HTML as the manifest, fails, and quietly installs a
    // BOOKMARK with full Safari chrome instead of a standalone app. Nothing
    // errors anywhere.
    expect(isSignedOutReachable("/manifest.webmanifest")).toBe(true);
  });

  it("should reach robots.txt without a session — the first instance of the same bug", () => {
    // Caught in live verification too: a crawler was 307'd to /login and never
    // read the Disallow. Same cause, same discovery method, one file apart.
    expect(isSignedOutReachable("/robots.txt")).toBe(true);
  });

  it("should reach Sentry's tunnel without a session — the THIRD instance", () => {
    // `tunnelRoute: "/monitoring"` (next.config.ts) makes the browser POST error
    // reports same-origin so ad blockers cannot drop them. The SDK does not
    // attach our session, so a report from the login screen looks signed-out —
    // and without this it 307s to /login and Sentry receives nothing.
    //
    // ⚠️ Errors on /login are exactly the ones worth having, and the failure is
    // silent: the tell is "we get no errors from the login screen", which reads
    // as "none happen there". Same shape as the manifest and robots.txt above,
    // which is why this is a pinned test rather than a line someone re-reads.
    expect(isSignedOutReachable("/monitoring")).toBe(true);
    // ⚠️ Both spellings. Read out of the generated build manifest, not guessed:
    // the rewrite is `^/monitoring(/?)(?:/)?$`, so Sentry accepts a trailing
    // slash and an exact-match exemption would gate one of the two forms.
    expect(isSignedOutReachable("/monitoring/")).toBe(true);
  });

  it("should still require a session for the app itself", () => {
    // The exemptions above are two static files. Widening this into "the PWA is
    // exempt" would hand every app route to anyone.
    expect(isSignedOutReachable("/plan")).toBe(false);
    expect(isSignedOutReachable("/groceries")).toBe(false);
    expect(isSignedOutReachable("/api/trpc/grocery.current")).toBe(false);
    // Prefix-adjacent siblings must not ride along on the exact matches.
    expect(isSignedOutReachable("/manifest.webmanifest.map")).toBe(false);
    expect(isSignedOutReachable("/robots.txt.bak")).toBe(false);
    // The tunnel is an EXACT match too — "/monitoring" must not open
    // "/monitoring-dashboard" or anything else that merely starts with it.
    expect(isSignedOutReachable("/monitoringx")).toBe(false);
    expect(isSignedOutReachable("/monitoring/secrets")).toBe(false);
  });

  it("should always exempt the manifest from gate 1 too, or the app installs as a bookmark", () => {
    // A browser fetches the manifest with `credentials: "omit"`, so it never
    // carries `ma_access` even from a session that holds it. Gated, it 404s —
    // and a failed manifest fetch is SILENT: "Add to Home Screen" just makes a
    // plain bookmark with Safari chrome instead of a standalone app, which is
    // C's whole deliverable failing with nothing in any log.
    expect(shouldBlockRequest("/manifest.webmanifest", undefined, "secret")).toBe(false);
  });

  it("should keep the gate on everything the PWA reaches AFTER launch", () => {
    // ⚠️ The exemption above is the manifest and only the manifest. The
    // installed app's own start_url is still gated, and the PWA's cookie jar
    // is isolated from Safari's — so a freshly installed app opens on a flat
    // 404 with no address bar to escape it. That is a live product decision,
    // not something this file can fix; asserting it here so the exemption is
    // never widened into "the PWA is exempt" by someone reading it as the fix.
    expect(shouldBlockRequest("/plan", undefined, "secret")).toBe(true);
  });

  it("should not let an exempt prefix open up unrelated sibling paths", () => {
    expect(shouldBlockRequest("/invite-me", undefined, "secret")).toBe(true);
    expect(shouldBlockRequest("/no-access-x", undefined, "secret")).toBe(true);
  });

  it("should block robots.txt too, since a gated site shows nothing at all", () => {
    // Deliberate: robots.txt is exempt from the SESSION redirect in the proxy
    // (so crawlers can read it when the gate is off) but NOT from Gate 1.
    expect(shouldBlockRequest("/robots.txt", undefined, "secret")).toBe(true);
    expect(shouldBlockRequest("/robots.txt", undefined, null)).toBe(false);
  });

  it("should exempt the exact path only, not everything beneath it", () => {
    expect(shouldBlockRequest("/invite/anything", undefined, "secret")).toBe(true);
    expect(shouldBlockRequest("/no-access/x", undefined, "secret")).toBe(true);
  });
});

describe("isEmailAllowed", () => {
  it("should allow anyone when the allowlist is unset (public launch)", () => {
    expect(isEmailAllowed("stranger@example.com")).toBe(true);
  });

  it("should allow a listed email", () => {
    process.env.ALLOWED_EMAILS = "griffin@example.com,wife@example.com";
    expect(isEmailAllowed("wife@example.com")).toBe(true);
  });

  it("should be case-insensitive about the address", () => {
    process.env.ALLOWED_EMAILS = "griffin@example.com";
    expect(isEmailAllowed("Griffin@Example.com")).toBe(true);
  });

  it("should reject an unlisted email", () => {
    process.env.ALLOWED_EMAILS = "griffin@example.com";
    expect(isEmailAllowed("stranger@example.com")).toBe(false);
  });

  it("should reject a missing email when a list is configured", () => {
    process.env.ALLOWED_EMAILS = "griffin@example.com";
    expect(isEmailAllowed(null)).toBe(false);
    expect(isEmailAllowed(undefined)).toBe(false);
  });

  it("should not treat a substring as a match", () => {
    process.env.ALLOWED_EMAILS = "griffin@example.com";
    expect(isEmailAllowed("griffin@example.com.attacker.net")).toBe(false);
  });
});

describe("ACCESS_COOKIE", () => {
  it("should not collide with the supabase auth cookie pattern", () => {
    expect(/^sb-.+-auth-token(\.\d+)?$/.test(ACCESS_COOKIE)).toBe(false);
  });
});
