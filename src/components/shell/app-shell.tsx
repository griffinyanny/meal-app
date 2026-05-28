"use client";

import { TabBar } from "./tab-bar";

export type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex justify-center bg-background">
      <div className="w-full max-w-[430px] relative min-h-dvh flex flex-col">
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </main>
        <TabBar />
      </div>
    </div>
  );
}
