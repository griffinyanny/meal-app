"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./tab-bar";
import { DebugHud } from "@/components/debug/debug-hud";

export type AppShellProps = {
  children: React.ReactNode;
};

// The onboarding interview is a conversation, not a destination: showing tabs
// would invite someone to wander off mid-question, and the flow already offers
// a first-class "Skip for now" that lands them in the app properly.
const FULL_SCREEN_ROUTES = ["/welcome"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const chromeless = FULL_SCREEN_ROUTES.includes(pathname);

  return (
    <div className="min-h-dvh flex justify-center bg-background">
      <div className="w-full max-w-[430px] relative min-h-dvh flex flex-col">
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: chromeless
              ? "env(safe-area-inset-bottom, 0px)"
              : "calc(5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
        {!chromeless && <TabBar />}
        <DebugHud />
      </div>
    </div>
  );
}
