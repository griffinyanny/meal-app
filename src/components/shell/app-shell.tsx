"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./tab-bar";
import { DebugHud } from "@/components/debug/debug-hud";

export type AppShellProps = {
  children: React.ReactNode;
  // Resolved server-side in the (app) layout from verified claims. A prop
  // rather than a client query: see the note there.
  devTools?: boolean;
};

// The onboarding interview is a conversation, not a destination: showing tabs
// would invite someone to wander off mid-question, and the flow already offers
// a first-class "Skip for now" that lands them in the app properly.
const FULL_SCREEN_ROUTES = ["/welcome"];

// One wash per screen (spec §03, migration item 02). Three recipes, no fourth,
// and the choice is by role rather than by taste: `ambient` on the two surfaces
// where the chef is talking TO you — Plan proposes the week, You is what it
// remembers about you — and `flat` on the two you work IN, where a brighter
// wash would compete with a dense list you are scanning. `hero` is reserved for
// screens the orb is on, which today is the interview only; it owns its wash
// locally because it renders outside this shell's chrome.
//
// Longest-prefix match, so /recipes/<id> inherits /recipes.
const WASH_BY_ROUTE: ReadonlyArray<readonly [string, string]> = [
  ["/plan", "spec-light-ambient"],
  ["/you", "spec-light-ambient"],
  ["/recipes", "spec-light-flat"],
  ["/groceries", "spec-light-flat"],
];

export function AppShell({ children, devTools = false }: AppShellProps) {
  const pathname = usePathname();
  const chromeless = FULL_SCREEN_ROUTES.includes(pathname);
  const wash = WASH_BY_ROUTE.find(([prefix]) => pathname.startsWith(prefix))?.[1];

  return (
    <div className="min-h-dvh flex justify-center bg-background">
      <div className="w-full max-w-[430px] relative min-h-dvh flex flex-col">
        {/* Beneath the content layer, never animated, and inert to the pointer.
            Fixed rather than absolute so the light stays where it entered from
            while the page scrolls under it — a wash that scrolls away is a
            gradient, not lighting. A fixed element positions against the
            viewport rather than this column, so it needs the tab bar's own
            centring trick or it lands at the left edge on desktop. */}
        {wash && (
          <div
            aria-hidden
            data-testid="ambient-wash"
            className={`${wash} pointer-events-none fixed inset-y-0 left-1/2 z-0 w-full max-w-[430px] -translate-x-1/2`}
          />
        )}
        <main
          className="relative z-10 flex-1 overflow-y-auto"
          style={{
            paddingBottom: chromeless
              ? "env(safe-area-inset-bottom, 0px)"
              : "calc(5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
        {/* Feedback capture (1F/E) rides INSIDE the nav rather than floating
            over the app — see the note at its call site in `tab-bar.tsx`.
            ⚠️ IT IS THEREFORE ABSENT ON THE CHROMELESS ONBOARDING ROUTE, AND
            THAT IS BUG-071, NOT A DESIGN. An earlier version of this comment
            claimed the absence was "the right answer anyway: the interview is a
            conversation, and a report filed mid-question has no surface to
            describe." Both clauses are false. Onboarding IS a surface — route,
            step, rendered screen, screenshot — and "don't invite them to wander
            off mid-question" is the argument for hiding the TAB BAR, which is
            navigation. A feedback trigger is not navigation; the justification
            was borrowed because the control happens to live inside the nav.
            A PLACEMENT decision silently produced a SCOPE decision, and this
            comment then read back as though the scope decision were deliberate.
            Onboarding runs exactly once, so its defects cannot be re-derived by
            going back, and the second user's first run IS onboarding. The fix is
            an invocation that is invisible until used (Griffin, S69), which
            removes the tab-bar button too — not a trigger added here. */}
        {!chromeless && <TabBar devTools={devTools} />}
        <DebugHud />
      </div>
    </div>
  );
}
