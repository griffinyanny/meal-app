"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroceryListHeaderProps {
  total: number;
  checkedCount: number;
  onCopy: () => void;
}

// List header: eyebrow, title, live progress. The progress bar + a quiet
// completion banner replace any celebratory moment (understated, per the
// no-celebration rule). Copy exports the list to the clipboard (the V1 fallback).
export function GroceryListHeader({ total, checkedCount, onCopy }: GroceryListHeaderProps) {
  const [copied, setCopied] = useState(false);
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const allChecked = total > 0 && checkedCount === total;

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
        Groceries · This week
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[26px] font-bold leading-tight">Your list</h1>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-muted-foreground" data-testid="grocery-progress-count">
            {checkedCount} / {total}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[13px] font-semibold text-primary/90 hover:text-primary"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
          data-testid="grocery-progress-bar"
        />
      </div>

      {allChecked && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-3.5 py-3",
            "border border-[#30D158]/30 bg-[#30D158]/10"
          )}
          data-testid="grocery-complete-banner"
        >
          <Check className="size-5 text-[#30D158]" strokeWidth={2.4} />
          <span className="text-[13.5px] font-semibold">
            List complete — everything&apos;s covered.
          </span>
        </div>
      )}
    </div>
  );
}
