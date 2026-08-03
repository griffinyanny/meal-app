// URL sanitising for analytics (1F/D3, S63).
//
// ⚠️ Why this exists: `/invite?code=<SITE_ACCESS_CODE>` is a real route in this
// app, and gate 1's secret travels in that query string. PostHog captures
// `$current_url` on every event and on every pageview. Without this, one visit
// to an invite link puts the access code into a third-party analytics store,
// where it is also visible in every session replay's URL bar.
//
// Gate 1 is retired today (env only, Griffin's S59 call) — which is exactly why
// this is written as a general rule rather than a special case for one param.
// The route still exists, the gate can be re-enabled by setting one env var,
// and nobody re-reads the analytics config when they do that.

/**
 * Strip the query string and fragment, keep origin + path.
 *
 * Paths themselves are safe here: the only dynamic segment in the app is
 * `/recipes/<uuid>`, and a uuid is an opaque id, not content.
 *
 * Anything unparseable comes back as the pathname alone rather than being
 * passed through — an unrecognised URL shape is the case most likely to be
 * carrying something unexpected, so it fails closed.
 */
export function sanitizeAnalyticsUrl(raw: string): string {
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    // Not an absolute URL — a bare path, or something malformed.
    const cut = raw.search(/[?#]/);
    return cut === -1 ? raw : raw.slice(0, cut);
  }
}
