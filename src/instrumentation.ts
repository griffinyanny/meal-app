// Server + edge Sentry init (1F/D3, S63). Next calls `register()` once per
// runtime before anything else loads.
import { initSentry } from "@/lib/sentry-init";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    initSentry();
  }
}

// Required by Next 16 for server-side errors to reach Sentry from nested React
// Server Components — without it, an RSC throw is logged and lost.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
