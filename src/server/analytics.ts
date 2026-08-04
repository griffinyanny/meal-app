// The server-side analytics sink (1F/D3, S63). Taxonomy: `@/lib/analytics/events`.
//
// ⚠️ WHY THERE IS A SERVER SINK AT ALL — this is BUG-035's lesson, not a
// preference. `useObject` only populates `error` for a failed REQUEST. The
// plan stream route has already returned 200 with an open body by the time
// anything can stall, so a dead stream reaches the browser as a body that
// simply CLOSES: `isLoading` goes false, `error` stays undefined, and the
// client genuinely cannot tell a timeout from a provider stall from an invalid
// document. Only the server knows which one it was.
//
// Client events and server events join because both use the Supabase user id
// as the distinct id.

import { after } from "next/server";
import { PostHog } from "posthog-node";
import type { EventName, EventProps } from "@/lib/analytics/events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!KEY) return null;
  if (!client) {
    client = new PostHog(KEY, {
      host: HOST,
      // ⚠️ Send on every event rather than batching. A Vercel function is
      // killed the moment it responds, and a batch waiting on an interval that
      // never fires is an event that silently never existed. Fine at this
      // volume; the whole point is that the failures we most need are the ones
      // where the function is about to die.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Send a taxonomy event as the given user.
 *
 * Same compile-time contract as the browser `track`: unknown name or wrong
 * properties will not build, and no property can carry user content.
 */
export function trackServer<N extends EventName>(
  distinctId: string,
  name: N,
  props: EventProps<N>
): void {
  const posthog = getClient();
  if (!posthog) return;

  posthog.capture({ distinctId, event: name, properties: props });

  // Keep the function alive until the event is actually on the wire.
  // `after` throws outside a request scope (a script, a test), which is not a
  // reason to lose the event or to crash the caller.
  try {
    after(async () => {
      await posthog.flush();
    });
  } catch {
    void posthog.flush().catch(() => {});
  }
}

/**
 * Map a thrown AI error onto the taxonomy's failure reasons.
 *
 * ⚠️ Deliberately coarse. The value of this field is grouping ("nine timeouts
 * this week"), and a reason derived from a provider's message string is a
 * field that changes shape when the provider changes wording. `unknown` is an
 * honest bucket; a plausible-looking wrong label is not.
 */
export function classifyAiFailure(error: unknown): AiFailureReason {
  const message = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase();

  if (message.includes("abort") || message.includes("timeout")) return "timeout";
  if (message.includes("rate limit") || message.includes("429")) {
    return "rate_limited";
  }
  if (message.includes("budget")) return "budget_exhausted";
  if (message.includes("schema") || message.includes("validation")) {
    return "invalid_plan";
  }
  return "unknown";
}

type AiFailureReason = EventProps<"plan_generation_failed">["reason"];
