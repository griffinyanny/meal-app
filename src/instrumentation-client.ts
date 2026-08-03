// Browser Sentry init (1F/D3, S63). Next loads this before any app code.
import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry-init";

initSentry();

// Ties client-side navigations to the transaction Sentry opened, so an error
// on /groceries is not attributed to whichever route was loaded first.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
