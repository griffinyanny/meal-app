"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroceryItem } from "./use-grocery-mutations";
import { formatQty, capitalizeName } from "./grocery-format";

interface GotItZoneProps {
  items: GroceryItem[];
  onUncheck: (itemId: string) => void;
  onClear: () => void;
}

// The single collapsible "GOT IT" zone at the bottom of the list. Checking any
// item anywhere drops it here (see decisions.md — one-zone check-off); tapping a
// row here puts it back. "Clear" removes the checked items for good.
export function GotItZone({ items, onUncheck, onClear }: GotItZoneProps) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;

  return (
    <div className="pt-6" data-testid="grocery-gotit-zone">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
          aria-expanded={open}
        >
          <span className="spec-eyebrow">
            Got it · {items.length}
          </span>
          <ChevronDown
            className={cn(
              "size-[15px] text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-primary/90 hover:text-primary"
        >
          Clear
        </button>
      </div>

      {open && (
        <ul className="glass-card mt-2.5 divide-y divide-[rgba(240,222,190,0.05)] overflow-hidden">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onUncheck(item.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-label={`Uncheck ${item.name}`}
              >
                {/* Same completion hue as the row it mirrors (B5) — this zone
                    is the checked items, so it cannot say "done" differently. */}
                <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[var(--spec-success)]">
                  <Check className="size-[13px] text-[var(--spec-floor)]" strokeWidth={3} />
                </span>
                <span className="flex-1 spec-row-title text-muted-foreground line-through">
                  {capitalizeName(item.name)}
                </span>
                <span className="shrink-0 spec-body text-muted-foreground/60">
                  {formatQty(item.quantity, item.unit)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
