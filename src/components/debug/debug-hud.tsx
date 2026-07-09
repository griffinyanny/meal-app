"use client";

import { useCallback, useEffect, useState } from "react";
import { hudEnabled, readDebugPanels } from "@/lib/debug/debug-hud";

// Toggleable, copyable overlay of live app state — kills the "describe your
// state in prose" round-trip during manual QA. Toggle with Cmd/Ctrl+Shift+D or
// the 🐛 button. Copy dumps a JSON snapshot to the clipboard. Renders nothing
// unless enabled (dev / NEXT_PUBLIC_DEBUG_HUD / localStorage debug-hud=1).
export function DebugHud() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [copied, setCopied] = useState(false);

  // Resolve enablement on mount only (client-only: reads window/localStorage),
  // which is the hydration-safe pattern despite the set-state-in-effect lint.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setEnabled(hudEnabled()), []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  // Live-refresh the snapshot while open.
  useEffect(() => {
    if (!open) return;
    // Seed immediately, then poll — a debug read of external (registry) state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(readDebugPanels());
    const id = setInterval(() => setSnapshot(readDebugPanels()), 300);
    return () => clearInterval(id);
  }, [open]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(readDebugPanels(), null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard unavailable (permissions) — ignore in a debug tool.
    }
  }, []);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        data-testid="debug-hud-toggle"
        aria-label="Toggle debug HUD"
        onClick={() => setOpen((o) => !o)}
        className="fixed left-2 top-2 z-[60] rounded-full bg-black/60 px-2 py-1 font-mono text-[11px] text-white/80"
      >
        🐛
      </button>

      {open && (
        <div
          data-testid="debug-hud-panel"
          className="fixed inset-x-2 bottom-24 z-[60] max-h-[50vh] overflow-auto rounded-xl border border-white/15 bg-black/85 p-3 font-mono text-[11px] leading-snug text-white/90 backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">DEBUG HUD</span>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="debug-hud-copy"
                onClick={copy}
                className="rounded bg-white/10 px-2 py-0.5"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-white/10 px-2 py-0.5"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
