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
