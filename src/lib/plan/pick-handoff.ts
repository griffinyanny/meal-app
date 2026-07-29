// A recipe chosen on the Recipes tab, on its way to a week that does not exist
// yet (Phase 1E.5 · W10).
//
// `Add to this week` never asks for a day — the chef answers with the night. But
// when there is no week at all there is no chef answer to give, and the honest
// move is to carry the choice into the intent screen rather than fail at a
// button that reads like it should work. Same read-once sessionStorage shape as
// the onboarding hand-off, and deliberately a SEPARATE key: one clobbering the
// other would silently lose either the interview's first request or the pick.
const KEY = "meal-app:pick-handoff";

export interface PickHandoff {
  id: string;
  title: string;
}

export function writePickHandoff(pick: PickHandoff): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pick));
  } catch {
    // A blocked or full sessionStorage costs the carried pick and nothing else:
    // the intent screen still opens, and its own library door is right there.
  }
}

export function takePickHandoff(): PickHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { id, title } = parsed as Partial<PickHandoff>;
    if (typeof id !== "string" || typeof title !== "string") return null;
    return { id, title };
  } catch {
    return null;
  }
}
