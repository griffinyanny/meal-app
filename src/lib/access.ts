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
 * Gate 2. Unset ALLOWED_EMAILS means open signup, which is the public-launch
 * state. A configured list with no match is a hard no.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  const list = parseEmailList(process.env.ALLOWED_EMAILS);
  if (list.length === 0) return true;
  if (!email) return false;
  return list.includes(email.toLowerCase());
}
