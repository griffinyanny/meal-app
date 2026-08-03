// Shared Sentry init (1F/D3, S63).
//
// One place decides WHETHER Sentry runs and with what options, because the SDK
// is initialised from three entry points (client, node server, edge) and three
// copies of a sampling rate is three chances for them to disagree.
//
// ⚠️ OFF unless a DSN is present — an allow-list, exactly like the PostHog key.
// That is what keeps it out of local dev and out of both Playwright suites: a
// 139-spec run that reports its deliberately-triggered error states to Sentry
// produces an issue feed of things nobody did.

import * as Sentry from "@sentry/nextjs";

/**
 * ⚠️ NOT a secret, despite looking like one. A DSN only accepts events; it
 * cannot read them. It is `NEXT_PUBLIC_` on the client by necessity. The token
 * that IS secret is `SENTRY_AUTH_TOKEN`, which is build-time only and never
 * reaches a bundle.
 */
export function sentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;
}

export function sentryEnabled(): boolean {
  return !!sentryDsn();
}

export function initSentry(extra: Parameters<typeof Sentry.init>[0] = {}): void {
  const dsn = sentryDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Vercel stamps this per deployment, so an issue says which build produced
    // it. Without it every regression looks like it has always been there.
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // Errors are the point. Performance tracing is a separate cost centre and a
    // separate quota, and this app's latency questions are already answered by
    // the taxonomy's own `duration_ms` fields on the calls that matter.
    tracesSampleRate: 0,

    // ⚠️ OFF. Sentry's own replay is a SECOND recorder with its OWN masking
    // defaults, and this project deliberately inverted PostHog's. Running both
    // means the careful posture in `lib/analytics/masking.ts` governs one
    // recording while the other quietly ships the vendor default — which is
    // precisely the leak the posture exists to prevent.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // ⚠️ `sendDefaultPii` is false by DEFAULT in the SDK and is restated here
    // because it is the one flag whose absence looks identical to its being
    // considered. It would attach IP addresses, cookies and request bodies —
    // and a request body on this app is an interview answer or a chef message.
    sendDefaultPii: false,

    ...extra,
  });
}
