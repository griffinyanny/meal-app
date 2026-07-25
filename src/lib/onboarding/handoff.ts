// The one piece of interview state that has to survive the trip into the Plan
// tab (Phase 1E, feature #4).
//
// Everything the interview learned is already persisted server-side and reaches
// plan generation through getChefContext. The exception is the SEED REQUEST —
// the one-off "my first week: leaning Thai, featuring fish, with real heat"
// sentence that makes the very first plan visibly reflect the conversation the
// user just had. It's transient by nature (it must not steer week 12), so it
// rides in sessionStorage rather than becoming a preference or a URL parameter
// that could be shared, bookmarked, or replayed.
//
// Read-once: the Plan tab clears it as it consumes it, so a later visit to the
// intent screen is a normal, unseeded one.
const KEY = "meal-app:onboarding-handoff";

export interface OnboardingHandoff {
  request?: string;
}

export function writeHandoff(handoff: OnboardingHandoff): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // A blocked/full sessionStorage costs the seeded first request, nothing
    // more — the plan still generates from persisted preferences.
  }
}

export function takeHandoff(): OnboardingHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const request = (parsed as OnboardingHandoff).request;
    return { request: typeof request === "string" ? request : undefined };
  } catch {
    return null;
  }
}
