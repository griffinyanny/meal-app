import { useEffect } from "react";

// Dev-only debug HUD registry. Any surface publishes a named section via one
// useDebugPanel() call; the DebugHud reads all sections on demand. A plain
// module-level registry (not React context) keeps publishing free of app-wide
// re-renders. See docs/plans/spike-e2e-testing-harness.md (Phase 0).

type PanelGetter = () => unknown;

const registry = new Map<string, PanelGetter>();

// Registers a debug section. Re-registers every render so the stored getter
// always closes over fresh state; removes on unmount.
export function useDebugPanel(section: string, getState: PanelGetter): void {
  useEffect(() => {
    registry.set(section, getState);
    return () => {
      registry.delete(section);
    };
  });
}

export function readDebugPanels(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [section, get] of registry) {
    try {
      out[section] = get();
    } catch (err) {
      out[section] = `<error: ${err instanceof Error ? err.message : String(err)}>`;
    }
  }
  return out;
}

// Enabled in development, when NEXT_PUBLIC_DEBUG_HUD=1 is baked at build, OR when
// a runtime localStorage flag is set (lets Griffin flip it on his phone / prod
// without a rebuild, and lets the E2E suite enable it in isolation). Resolved
// client-side only — callers must invoke after mount to avoid SSR mismatch.
export function hudEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_DEBUG_HUD === "1") return true;
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem("debug-hud") === "1";
    } catch {
      return false;
    }
  }
  return false;
}
