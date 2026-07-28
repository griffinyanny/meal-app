"use client";

import { Eye, MessageCircle, FileClock, Pencil, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Memory } from "./use-you-mutations";

// How the chef learned a memory → the honest provenance label + icon. "I noticed"
// (implicit signals, feature #6) is accent-tinted so behavior-derived notes read
// distinctly from things you said.
const PROVENANCE: Record<
  Memory["sourceType"],
  { icon: LucideIcon; label: string; accent: boolean }
> = {
  onboarding: { icon: FileClock, label: "You told me when we started", accent: false },
  explicit: { icon: MessageCircle, label: "You told me", accent: false },
  implicit: { icon: Eye, label: "I noticed", accent: true },
};

export interface MemoryCardProps {
  memory: Memory;
  onRemove: (memory: Memory) => void;
  // Edit routes through Talk-to-Chef (re-tell) — there is no inline memory edit
  // in v1 (gap #1). Opens the chef sheet.
  onEdit: () => void;
}

export function MemoryCard({ memory, onRemove, onEdit }: MemoryCardProps) {
  const prov = PROVENANCE[memory.sourceType] ?? PROVENANCE.explicit;
  const Icon = prov.icon;

  return (
    <div data-testid="you-memory" className="glass-card rounded-2xl p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon
          className={cn("size-3.5", prov.accent ? "text-primary" : "text-muted-foreground")}
          strokeWidth={1.9}
        />
        <span
          className={cn(
            "text-[11px] font-semibold tracking-wide",
            prov.accent ? "text-primary/90" : "text-muted-foreground"
          )}
        >
          {prov.label}
        </span>
      </div>
      <div className="flex items-start gap-2.5">
        <p className="min-w-0 flex-1 text-[0.9rem] leading-snug text-foreground [text-wrap:pretty]">
          {memory.content}
        </p>
        <div className="flex flex-none gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Tell the chef what changed"
            className="flex size-7 items-center justify-center rounded-[9px] border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.05)] text-[var(--spec-text-body)] transition-colors hover:bg-[rgba(240,222,190,0.1)]"
          >
            <Pencil className="size-3.5" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(memory)}
            aria-label="Remove this memory"
            className="flex size-7 items-center justify-center rounded-[9px] border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.05)] text-[var(--spec-text-body)] transition-colors hover:bg-[rgba(240,222,190,0.1)]"
          >
            <X className="size-3.5" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </div>
  );
}
