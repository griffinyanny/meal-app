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
      <p className="spec-eyebrow">
        Groceries · This week
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="spec-spoken-headline">Your list</h1>
        <div className="flex shrink-0 items-center gap-3">
          <span className="spec-body text-muted-foreground" data-testid="grocery-progress-count">
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

      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(240,222,190,0.07)]">
        <div
          // ⚠️ Was bg-primary: cream, the ACTION hue, filling a bar you cannot
          // press. §01 says cream is what the finger is meant to find, so a
          // status indicator wearing it is B1's draft pill and BUG-046's recipe
          // body one surface over. It measures completion, so it takes the
          // completion hue the checks beneath it now carry.
          className="h-full rounded-full bg-[var(--spec-success)] transition-[width] duration-[var(--spec-motion-enter)]"
          style={{ width: `${pct}%` }}
          data-testid="grocery-progress-bar"
        />
      </div>

      {allChecked && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-3.5 py-3",
            "spec-success-soft"
          )}
          data-testid="grocery-complete-banner"
        >
          <Check className="size-5 text-[var(--spec-success)]" strokeWidth={2.4} />
          <span className="spec-body">
            List complete — everything&apos;s covered.
          </span>
        </div>
      )}
    </div>
  );
}
