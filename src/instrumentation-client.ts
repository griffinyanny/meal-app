// Browser observability init (1F/D3, S63). Next loads this before ANY app code,
// which is why both SDKs belong here.
//
// ⚠️ PostHog moved here from a `useEffect` in `AnalyticsProvider`, following
// PostHog's official Next.js guide — `instrumentation-client.ts` is the
// documented location. The difference is not cosmetic for session replay: a
// `useEffect` runs after hydration, so the recorder attaches late and misses
// the first paint of whatever screen the person landed on. Init here runs
// before the app does.
import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry-init";
import { initAnalytics } from "@/lib/analytics";

initSentry();
initAnalytics();

// Ties client-side navigations to the transaction Sentry opened, so an error
// on /groceries is not attributed to whichever route was loaded first.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
