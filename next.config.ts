import type { NextConfig } from "next";

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
  // LAUNCH-DAY ITEM: remove this + public/robots.txt. See docs/bug-tracker.md (BUG-030).
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

export default nextConfig;
