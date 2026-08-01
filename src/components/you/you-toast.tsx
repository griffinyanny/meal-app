"use client";

export interface YouToastState {
  message: string;
  onUndo?: () => void;
}

export interface YouToastProps {
  toast: YouToastState | null;
  onUndo: () => void;
}

// A single bottom toast: the honest capture/removal confirmation, with an Undo
// action (feature #5, gap #2). Sits above the tab bar within the phone column.
// The orchestrator owns show/auto-dismiss; this is purely presentational.
export function YouToast({ toast, onUndo }: YouToastProps) {
  if (!toast) return null;
  return (
    <div
      data-testid="you-toast"
      role="status"
      aria-live="polite"
      className="glass-sheet fixed left-1/2 z-50 flex max-w-[86%] -translate-x-1/2 items-center gap-3 rounded-[14px] px-4 py-2.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8)]"
      style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <span className="spec-meta text-foreground">
        {toast.message}
      </span>
      {toast.onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="flex-none text-[0.8rem] font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Undo
        </button>
      )}
    </div>
  );
}
