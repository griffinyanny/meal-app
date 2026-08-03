"use client";

import { useEffect } from "react";
import { identifyUser, initAnalytics, track } from "@/lib/analytics";
import { takeAbandonedRitual } from "@/lib/analytics/ritual";

export type AnalyticsProviderProps = {
  /**
   * The Supabase user id, read from verified claims in the `(app)` layout.
   *
   * ⚠️ The id, never the email. It is also what the server sink uses as its
   * distinct id, which is what makes the browser and server event streams join
   * — see `src/server/analytics.ts`.
   */
  userId: string;
};

/**
 * Is the app running as an installed PWA?
 *
 * ⚠️ Two checks, not one. `display-mode: standalone` is the standard and works
 * on modern iOS; `navigator.standalone` is the old iOS-only property and is
 * the fallback for anything older. This is the only AUTOMATED evidence that
 * the install actually took — the two-phone check is manual and unrepeatable,
 * so this is what says it is still true in week two.
 */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Module-level rather than a ref: React StrictMode double-invokes effects in
// development, and a launch reported twice is a launch reported wrong.
let launchReported = false;

export function AnalyticsProvider({ userId }: AnalyticsProviderProps) {
  useEffect(() => {
    initAnalytics();
    identifyUser(userId);

    if (!launchReported) {
      launchReported = true;

      track("app_launched", {
        display_mode: isStandalone() ? "standalone" : "browser",
        offline: typeof navigator !== "undefined" && !navigator.onLine,
      });

      // A ritual that started and never reached a list. Reported once, on the
      // next launch, then cleared — without it the DoD's "< 10 minutes" is
      // computed only over the rituals that finished.
      const abandoned = takeAbandonedRitual(Date.now());
      if (abandoned) {
        track("ritual_abandoned", {
          ritual_id: abandoned.ritual.id,
          last_step: abandoned.ritual.lastStep,
          age_ms: abandoned.ageMs,
        });
      }
    }
  }, [userId]);

  // Connectivity, which on this app is a product state rather than a nuisance:
  // the whole offline half of C exists for the walk to the shop.
  useEffect(() => {
    let offlineSince: number | null =
      typeof navigator !== "undefined" && !navigator.onLine ? Date.now() : null;

    function onOffline() {
      offlineSince = Date.now();
      track("connectivity_changed", { online: false, offline_duration_ms: null });
    }

    function onOnline() {
      track("connectivity_changed", {
        online: true,
        offline_duration_ms: offlineSince ? Date.now() - offlineSince : null,
      });
      offlineSince = null;
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
