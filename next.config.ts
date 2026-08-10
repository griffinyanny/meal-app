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

  env: {
    // Which build a feedback report came from (1F/E). Without it a report says
    // "this is broken" and nothing says which deploy it was broken on — the
    // fix ships, the next report looks identical, and there is no way to tell
    // whether it is a regression or a stale build.
    //
    // ⚠️ DERIVED FROM THE BASE SYSTEM VAR, NOT THE FRAMEWORK-PREFIXED ONE.
    // Vercel also exposes `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` for Next.js
    // projects, and reading that directly would have been one character
    // shorter — but it depends on Vercel's framework-prefix behaviour, which
    // cannot be verified without a deploy, and a null SHA is exactly the kind
    // of silent gap this project keeps finding after the fact. Reading
    // `VERCEL_GIT_COMMIT_SHA` (the base system var, present whenever
    // `autoExposeSystemEnvs` is on — measured true for this project via the
    // API) and re-exporting it removes that dependency entirely.
    //
    // Empty string locally and in both Playwright suites, where there is no
    // Vercel build. `capture.ts` maps that to null.
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
};

// ⚠️ The wrapper ALWAYS runs; only the source-map upload is conditional.
//
// An earlier version made the whole wrapper conditional on `SENTRY_AUTH_TOKEN`,
// which quietly coupled two unrelated things: `tunnelRoute` is a RUNTIME
// ad-blocker mitigation and source-map upload is a BUILD-time convenience, and
// tying them meant a production deploy without a token would silently have no
// tunnel. Nothing would look wrong; error reports would just stop arriving from
// anyone running a blocker.
//
// Upload engages only where a token exists (in practice, Vercel). Both
// Playwright suites build without one and pay only for the wrapper itself.
const uploadSourceMaps = !!process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // No token → nothing to upload, and the plugin must not try. With one, strip
  // the maps from the bundle after upload: otherwise the full unminified source
  // is served to anyone who opens devtools, and this client bundle carries the
  // chef's prompt scaffolding and every access-gate code path.
  sourcemaps: uploadSourceMaps
    ? { deleteSourcemapsAfterUpload: true }
    : { disable: true },
  // Widens the set of client files uploaded, which is what makes a client stack
  // trace resolve to real code instead of a minified chunk name.
  widenClientFileUpload: uploadSourceMaps,
  // ⚠️ REVERSED IN S63 after reading Sentry's own Next.js reference.
  //
  // This was originally left OFF, reasoning that a same-origin ingest route
  // sits behind `src/proxy.ts` and would 307 signed-out error reports to
  // `/login` — the S59 manifest bug a third time. That risk is real, but the
  // conclusion was wrong: Sentry documents the proxy exclusion as a REQUIRED
  // step, and this app already has the mechanism (`isSignedOutReachable()`,
  // one line, already tested). A mitigable risk is not a reason to skip a
  // feature; it is a reason to apply the mitigation.
  //
  // What changed the call: without the tunnel, an ad blocker silently drops
  // error reports — and one of the two validation users is a software
  // engineer who may well run one. Losing half the cohort's errors, silently,
  // costs more than one entry on a list.
  //
  // ⚠️ `/monitoring` MUST stay on `isSignedOutReachable()`. `access.test.ts`
  // pins it.
  tunnelRoute: "/monitoring",
});
