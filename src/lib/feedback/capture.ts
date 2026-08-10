// Assembles the diagnostic payload attached to every feedback report (1F/E).
//
// ⚠️ CALLED AT SHEET-OPEN, NOT AT SUBMIT (E0 call 1). Opening a sheet can itself
// change what is on screen, and the report may be typed a minute later — by then
// the route can have changed, a query can have refetched, and the ring buffer
// will have filled with calls the sheet itself made. The payload has to describe
// the moment he decided something was wrong.
//
// Every field degrades to a value rather than throwing. A capture path that can
// throw turns "I found a bug" into "I found two", and the second one eats the
// first.
import { lastEventId } from "@sentry/nextjs";
import { readDebugPanels } from "@/lib/debug/debug-hud";
import { sessionReplayUrl } from "@/lib/analytics";
import { readTrpcRing } from "./trpc-ring";
import type { ClientPayload } from "./payload";

// Set in `next.config.ts` from Vercel's `VERCEL_GIT_COMMIT_SHA` at build time.
// Empty locally and in both Playwright suites (no Vercel build), and normalised
// to null here so "we could not tell which build" is a VALUE in the row rather
// than a missing key that reads as an oversight.
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || null;

// iOS Safari predates the display-mode media query for installed apps and sets a
// non-standard `navigator.standalone` instead. Both are checked because R1's two
// devices are iPhones and "was he in the installed app or a Safari tab" has
// already decided the diagnosis twice (S59's manifest, S60's service worker).
function isStandalone(): boolean {
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    return (
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
    );
  } catch {
    return false;
  }
}

// The last error Sentry saw in this session, so a report that says "it broke"
// lands next to the stack trace of it breaking.
//
// ⚠️ Checked against the installed package, not assumed (S63). `lastEventId` is
// exported by `@sentry/react`, which `@sentry/nextjs`'s CLIENT build re-exports
// (`export * from '@sentry/react'`) — it is genuinely absent from the SERVER
// build, so a Node-resolved probe of this symbol reports `undefined` and looks
// like the API does not exist. This module is client-only (it reads `window`).
function safeSentryEventId(): string | null {
  try {
    return lastEventId() ?? null;
  } catch {
    return null;
  }
}

export function captureClientPayload(): ClientPayload {
  const now = Date.now();
  return {
    // pathname only. Query strings are stripped everywhere else in this app
    // (`sanitizeAnalyticsUrl`) because `/invite?code=…` carries the access-gate
    // secret, and there is no reason for this path to be the exception.
    route: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: window.navigator.userAgent.slice(0, 500),
    standalone: isStandalone(),
    buildSha: BUILD_SHA,
    replayUrl: sessionReplayUrl(),
    sentryEventId: safeSentryEventId(),
    // ⚠️ `{}` on Recipes, You and onboarding, and that is the honest state:
    // `useDebugPanel` has two registration sites (Plan and Groceries). The scope
    // doc's "already produces most of this" was measured false at E0 — a
    // registry existing is not a registry populated.
    debugPanels: readDebugPanels(),
    trpcCalls: readTrpcRing(now),
    capturedAt: new Date(now).toISOString(),
  };
}
