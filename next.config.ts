import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Security headers. Supabase auth cookies are JS-readable by design
// (@supabase/ssr), so XSS = session theft; these are the backstop.
// Note: no script-src CSP yet — Next.js inline runtime scripts need nonces,
// which is its own project. frame-ancestors alone kills clickjacking.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Closed beta. robots.txt asks politely; this one is binding for the crawlers
  // that honour it, and covers routes a Disallow line can miss. Deliberately NOT
  // env-driven, unlike the two access gates: headers() is evaluated at BUILD
  // time while the gates read env at request time, so wiring it to the same vars
  // would let the two silently disagree. It is one line to delete instead.
  // LAUNCH-DAY ITEM: remove this + public/robots.txt. See docs/bug-tracker.md (BUG-043).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// ⚠️ The wrapper is a BUILD-time concern and is deliberately conditional.
//
// `withSentryConfig` adds a source-map upload step. Both Playwright suites run
// `npm run build` inside their own webServer command — the behaviour suite
// already costs ~19 minutes — and neither has (or should have) an auth token.
// Without this guard the wrapper runs on every one of those builds, warns, and
// buys nothing.
//
// So the upload only engages where a token exists, which in practice is Vercel.
// Everything else (dev, CI, both suites) gets the plain config, and the runtime
// SDK still initialises wherever a DSN is set — the two are independent.
const withSourceMaps = !!process.env.SENTRY_AUTH_TOKEN;

export default withSourceMaps
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Strip the maps from the client bundle after upload. Without this the
      // full unminified source is served to anyone who opens devtools — and
      // this app's client bundle contains the chef's prompt scaffolding and
      // every access-gate code path.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // ⚠️ `tunnelRoute` is deliberately NOT set, and this is the S59 finding
      // applied before it could bite rather than after.
      //
      // It creates a same-origin route (`/monitoring`) that the browser POSTs
      // error reports to, to dodge ad blockers. `src/proxy.ts` gates every
      // path not on `isSignedOutReachable()`, and `/monitoring` would not be
      // on it — so a report from a SIGNED-OUT browser would 307 to `/login`
      // and Sentry would receive nothing. Errors on the login screen are
      // exactly the ones worth having, and the failure is silent: the tell is
      // "we get no errors from /login", which reads as "none happen there".
      //
      // That is the third time this exact shape has appeared in this app
      // (`/manifest.webmanifest` twice in S59, `/robots.txt` before it), and
      // the fix each time was a path added to a list nobody re-reads. At two
      // users, ad-blocker evasion does not buy enough to add a fourth. Same
      // call as PostHog's, so both vendors go direct and there is one rule.
    })
  : nextConfig;
