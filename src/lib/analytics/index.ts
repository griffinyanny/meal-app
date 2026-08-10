// The browser analytics sink (1F/D3, S63). Taxonomy: `./events`. Masking
// policy: `./masking`. Prose: `docs/observability-taxonomy.md`.
//
// Replaces the S9-era `src/lib/analytics.ts` stub — 15 lines of dev-only
// `console.log` that S9's decision row called "the vendor abstraction layer,
// built in Phase 1" and that had **zero call sites** in the whole app.

import posthog from "posthog-js";
import { maskTextFn } from "./masking";
import { sanitizeAnalyticsUrl } from "./sanitize";
import type { EventName, EventProps } from "./events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let started = false;

/**
 * Analytics is OFF unless a key is present — an allow-list, not a denylist.
 *
 * ⚠️ This is what keeps the E2E suite out of the dataset. Both Playwright
 * configs set `NEXT_PUBLIC_POSTHOG_KEY: ""` in their `webServerEnv`, which
 * beats `.env.local` at build time, so a 139-spec run cannot fabricate rituals
 * that would then be averaged into the DoD's "< 10 minutes on a real week".
 * `analytics-config.test.ts` fails if that line is ever removed.
 */
export function analyticsEnabled(): boolean {
  return typeof window !== "undefined" && !!KEY;
}

export function initAnalytics(): void {
  if (started || !analyticsEnabled()) return;
  started = true;

  posthog.init(KEY as string, {
    api_host: HOST,

    // ⚠️ OFF, and this is not a preference. Autocapture records the TEXT of
    // every element clicked, which is precisely the rendered output the
    // masking posture exists to keep out — it would route around the whole
    // policy through a different door. Every event this app sends is
    // deliberate and named in `./events`.
    autocapture: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,

    // Sentry owns errors. Two exception pipelines means two places to look and
    // two sets of noise.
    capture_exceptions: false,

    // No profile for a visitor who never signs in.
    person_profiles: "identified_only",

    // ⚠️ Strips query strings from every captured URL. `/invite?code=…` carries
    // the SITE_ACCESS_CODE gate secret in a query param; nothing else in the
    // app puts content in a URL today, but the sanitiser is the durable answer
    // and the gate route still exists.
    sanitize_properties: (properties) => {
      for (const key of ["$current_url", "$referrer", "$pathname"] as const) {
        const value = properties[key];
        if (typeof value === "string") {
          properties[key] = sanitizeAnalyticsUrl(value);
        }
      }
      return properties;
    },

    session_recording: {
      // The inverted posture. See `./masking` — mask everything, then unmask
      // an explicit allow-list via `data-ph-unmask`.
      maskAllInputs: true,
      maskTextSelector: "*",
      maskTextFn,
    },
  });
}

/**
 * Bind events to the signed-in user.
 *
 * ⚠️ The Supabase user id ONLY. Never the email, never a display name — the
 * same rule `.claude/rules/ai-pipelines.md` applies to prompts. The id is also
 * what the server sink uses as `distinctId`, which is what makes the browser
 * and server event streams join.
 */
export function identifyUser(userId: string): void {
  if (!analyticsEnabled()) return;
  posthog.identify(userId);
}

/** Called on sign-out so the next person on this device is a new identity. */
export function resetAnalytics(): void {
  if (!analyticsEnabled()) return;
  posthog.reset();
}

/**
 * The link from a feedback report to its session replay (1F/E, E0 call 5).
 *
 * ⚠️ WITHOUT THIS THE REPLAY EXISTS AND IS UNFINDABLE. A report says "the list
 * bounced back"; the recording of it happening is in PostHog under a session id
 * nothing else in the payload carries. This is the join.
 *
 * A URL rather than the bare session id because the reader is a person opening
 * it. Null when analytics is off (every E2E run, by design) or when the recorder
 * has not started — a value meaning "we could not tell", never a thrown error
 * inside a capture path.
 *
 * ⚠️ `|| null`, NOT `?? null`. Checked against the installed package rather than
 * assumed (S63): posthog-js types this as `string` and its own doc comment says
 * it returns **an empty string** when sessions are unavailable. `??` would let
 * `""` through, and `""` in a payload dump reads as "there is a replay link"
 * while being useless — a falsy sentinel that is not null is worse than a null.
 */
export function sessionReplayUrl(): string | null {
  if (!analyticsEnabled()) return null;
  try {
    return posthog.get_session_replay_url({ withTimestamp: true }) || null;
  } catch {
    return null;
  }
}

/**
 * Send a taxonomy event.
 *
 * The name must exist in `EventMap` and the properties must match it exactly,
 * or this does not compile — the BUG-044 discipline. No property can carry
 * user content; see the guard at the bottom of `./events`.
 */
export function track<N extends EventName>(name: N, props: EventProps<N>): void {
  if (!analyticsEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[analytics] ${name}`, props);
    }
    return;
  }
  posthog.capture(name, props);
}
