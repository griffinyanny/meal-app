// Closed-beta access controls (Griffin, S43). Two INDEPENDENT gates:
//
//   SITE_ACCESS_CODE  — hides the app, including the login screen, from anyone
//                       without the invite link. Blocks at the proxy.
//   ALLOWED_EMAILS    — decides who may hold an account. Blocks at the auth
//                       callback and again in the (app) layout.
//
// They are deliberately separate because they fail differently. Invite links
// get forwarded and codes leak, so the code alone must never be enough to
// create data or spend the OpenAI budget. Conversely the email list can't hide
// the app's existence from a crawler, which is what the code is for.
//
// BOTH DEFAULT TO OFF WHEN THEIR ENV VAR IS UNSET. That is what makes this
// reversible: adding a beta tester is an env change, and going fully public is
// deleting two env vars, neither of which is a code diff. It also means local
// dev and the E2E harness are untouched without configuring anything.
//
// The tradeoff of unset-means-off is that a deleted env var silently opens the
// app rather than bricking it. That is the deliberate choice — a fail-closed
// default would lock Griffin out of production on a typo, which is both more
// likely and worse than the case it protects against. Revisit if this ever
// guards something more valuable than a beta.
//
// NOTE the opposite default in `DEV_TOOLS_EMAILS` (user-dev-tools.ts): there,
// unset means NOBODY, because an unconfigured deployment should not expose a
// reset-my-account button. Same parsing, opposite answer. Don't cross them.

export const ACCESS_COOKIE = "ma_access";

/** Paths reachable without the invite cookie. Everything else 404s when the gate is on. */
const GATE_EXEMPT = [
  "/invite", // how you obtain the cookie in the first place
  "/no-access", // the "not on the invite list" explainer
  // ⚠️ The manifest must be readable WITHOUT the cookie, and this is not a
  // convenience (1F/C). Per the manifest spec a browser fetches it with
  // `credentials: "omit"` unless the link tag says otherwise, so the fetch
  // never carries `ma_access` even from a browser that holds it. Gated, it
  // 404s — and a failed manifest fetch does not error visibly, it just means
  // "Add to Home Screen" quietly produces a plain BOOKMARK with full Safari
  // chrome instead of a standalone app. C's "launches full-screen without
  // browser chrome" would be silently impossible while gate 1 is on.
  //
  // Safe to expose: the manifest holds the app name, colours and icon paths.
  // The flat-404 design exists to stop a crawler learning there is something
  // here — a crawler that guesses this exact path learns the name of an app it
  // still cannot enter, and gate 2 (ALLOWED_EMAILS) is what protects the data.
  // The icons need no entry: the proxy matcher excludes `.png` before the gate
  // ever runs.
  "/manifest.webmanifest",
];

/** Comma-separated env list -> lowercased, trimmed, non-empty entries. */
export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** The configured invite code, or null when the gate is off. */
export function siteAccessCode(): string | null {
  const code = process.env.SITE_ACCESS_CODE?.trim();
  return code ? code : null;
}

// Length-independent compare. A timing attack across the public internet on a
// short beta code is not a realistic threat, but this is auth-adjacent code and
// the constant-time version is six lines. Note Edge has no crypto.timingSafeEqual.
export function codesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Gate 1. True when the request should get a flat 404 instead of the app.
 * Pure so it can be tested without constructing a NextRequest.
 */
export function shouldBlockRequest(
  pathname: string,
  cookieValue: string | undefined,
  code: string | null
): boolean {
  if (!code) return false; // gate off
  // EXACT match only. Both exempt paths are single routes, so a prefix match
  // would widen the hole (/invite/anything) to buy nothing.
  if (GATE_EXEMPT.includes(pathname)) return false;
  return !codesMatch(cookieValue, code);
}

/**
 * Reachable WITHOUT a session. Everything else 307s to /login.
 *
 * Pure and exported for the same reason `shouldBlockRequest` is: this list has
 * now been wrong twice, both times found by hitting the live URL rather than by
 * any test, and both times because a path was assumed to be "outside the app"
 * when the proxy matcher in fact covers it.
 *
 * ⚠️ `/robots.txt` was the first (a crawler was 307'd to /login and never read
 * the Disallow). `/manifest.webmanifest` is the second, and it is the sharper
 * one: **a browser fetches a manifest with `credentials: "omit"`, so it always
 * looks signed-out** — the redirect fires for a signed-in user on their own
 * phone. Safari then parses the /login HTML as the manifest, fails, and quietly
 * installs a BOOKMARK instead of a standalone app. Nothing errors.
 *
 * Note this is a SECOND gate from `shouldBlockRequest`, and exempting a path
 * there does not exempt it here — which is exactly how the manifest shipped
 * still broken after gate 1 was taken off it.
 */
export function isSignedOutReachable(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/invite" || // the step before signing in
    pathname === "/no-access" || // shown immediately after being signed out
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    // Sentry's ad-blocker tunnel (1F/D3). The browser POSTs error reports here
    // and the SDK does NOT attach our session, so without this a report from a
    // signed-out page 307s to /login and is lost — and errors on the login
    // screen are exactly the ones worth having. Third time this shape has come
    // up in this file (manifest twice in S59, robots.txt before it); Sentry's
    // own Next.js reference documents the exclusion as a required step.
    // ⚠️ Both forms. The generated rewrite is `^/monitoring(/?)(?:/)?$`, so
    // Sentry will accept a trailing slash and an exact-match exemption would
    // gate exactly one of the two spellings — the prefix-sibling trap that
    // `/manifest.webmanifest.map` already guards against, inverted.
    pathname === "/monitoring" ||
    pathname === "/monitoring/" ||
    pathname.startsWith("/auth")
  );
}

/**
 * Gate 2. Unset ALLOWED_EMAILS means open signup, which is the public-launch
 * state. A configured list with no match is a hard no.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  const list = parseEmailList(process.env.ALLOWED_EMAILS);
  if (list.length === 0) return true;
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

/**
 * Dev tools (test mode, feedback capture). ⚠️ **Unset means NOBODY** — the
 * opposite default to `ALLOWED_EMAILS` above, deliberately, because an
 * unconfigured deployment should expose no reset-my-account button. Same
 * parsing, opposite answer; don't cross them.
 *
 * ⚠️ ONE DEFINITION, TWO CALLERS, AND THE SECOND CALLER IS WHY THIS MOVED HERE
 * (1F/E). `user-dev-tools.ts` had this as a private function serving a tRPC
 * query, and the feedback trigger needs the same answer — but taking it as a
 * QUERY was measured to be actively harmful: a client query fired during mount
 * is batched by `httpBatchLink` with the page's own primary query, and adding
 * one to Plan's first load reliably reproduced BUG-058's intent-screen remount
 * (0/3 a11y failures without the component, 3/3 with it). The `(app)` layout
 * already holds a cryptographically verified email, so the answer is free
 * there and costs no request at all.
 *
 * Two callers, one definition — five copies of one domain is how BUG-044
 * happened.
 */
export function isDevToolsUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseEmailList(process.env.DEV_TOOLS_EMAILS).includes(
    email.toLowerCase()
  );
}
