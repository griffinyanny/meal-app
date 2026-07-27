"use client";

import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoryCard } from "./memory-card";
import type { Memory } from "./use-you-mutations";

const COLLAPSED_COUNT = 3;

export interface MemoryLedgerProps {
  memories: Memory[];
  onRemove: (memory: Memory) => void;
  onEdit: () => void;
}

// "What I've picked up" — the reviewable memory ledger (features #3 + #6). Each
// card labels how it was learned and offers remove + re-tell. Collapses to a few
// with an expand toggle. When empty, an honest "still learning" state (the chef is
// upfront that it has little yet — not a broken-looking blank).
export function MemoryLedger({ memories, onRemove, onEdit }: MemoryLedgerProps) {
  const [expanded, setExpanded] = useState(false);

  if (memories.length === 0) {
    return (
      <section data-testid="you-ledger-empty">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Still learning
        </p>
        <div className="rounded-[20px] border border-dashed border-white/[0.13] bg-white/[0.02] px-[22px] py-7 text-center">
          <div className="mx-auto mb-3.5 flex size-[46px] items-center justify-center rounded-[14px] bg-primary/10">
            <Eye className="size-[22px] text-primary" strokeWidth={1.7} />
          </div>
          <p className="mb-1.5 text-[0.95rem] font-semibold text-foreground">Nothing here yet.</p>
          <p className="mx-auto max-w-[280px] text-[0.82rem] leading-snug text-muted-foreground [text-wrap:pretty]">
            Thumb a meal up or down, or just tell me something, and I&apos;ll start remembering
            what makes dinner yours.
          </p>
        </div>
      </section>
    );
  }

  const visible = expanded ? memories : memories.slice(0, COLLAPSED_COUNT);
  const hidden = memories.length - visible.length;
  const hasToggle = hidden > 0 || (expanded && memories.length > COLLAPSED_COUNT);

  return (
    <section data-testid="you-ledger">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        What I&apos;ve picked up
      </p>
      <div className="flex flex-col gap-2.5">
        {visible.map((m) => (
          <MemoryCard key={m.id} memory={m} onRemove={onRemove} onEdit={onEdit} />
        ))}
      </div>

      {hasToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-white/10 bg-white/[0.04] py-3 text-[0.8rem] font-semibold text-[#C7C7CC] transition-colors hover:bg-white/[0.07]"
        >
          {expanded ? "Show less" : `${hidden} more the chef remembers`}
          <ChevronDown
            className={cn("size-[15px] transition-transform", expanded && "rotate-180")}
            strokeWidth={2.2}
          />
        </button>
      )}

      <p className="mx-0.5 mt-3.5 text-[0.8rem] leading-snug text-muted-foreground">
        Remove anything and I&apos;ll stop cooking around it.
      </p>
    </section>
  );
}
