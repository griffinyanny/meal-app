"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomBar } from "./bottom-bar";

export interface ModifyStatusPillsProps {
  ack: { text: string; firstDate: string | null } | null;
  errorMessage: string | null;
  onDismissAck: () => void;
  onRetry: () => void;
}

function scrollToDate(date: string | null) {
  if (!date) return;
  document
    .querySelector(`[data-meal-date="${date}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// The scroll-independent home for modify feedback: a whole-week change ack
// (taps to the first changed day) and an inline-modify error with retry. Both
// sit at the bottom anchor above the confirm bar — never a top-of-page toast
// the user can't see when scrolled down. The caller gates visibility.
export function ModifyStatusPills({
  ack,
  errorMessage,
  onDismissAck,
  onRetry,
}: ModifyStatusPillsProps) {
  if (errorMessage) {
    return (
      <BottomBar className="z-40">
        <div className="glass-sheet flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <span className="text-sm text-destructive/90">{errorMessage}</span>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </BottomBar>
    );
  }

  if (ack) {
    return (
      <BottomBar className="z-40">
        <button
          type="button"
          onClick={() => {
            scrollToDate(ack.firstDate);
            onDismissAck();
          }}
          className="glass-sheet flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
        >
          <span className="flex-1 text-sm text-foreground/90">{ack.text}</span>
          {ack.firstDate && (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </BottomBar>
    );
  }

  return null;
}
