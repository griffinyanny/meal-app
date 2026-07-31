"use client";

import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { capitalizeName } from "./grocery-format";
import type { GroceryCategory } from "@/lib/grocery-categories";

interface StaplesRowProps {
  // Lowercased names already on the current list. A staple that's already been
  // added is hidden from the row — tapping a chip optimistically adds the item,
  // which grows this set and makes the chip disappear (the design's "dismiss").
  onList: Set<string>;
  onAdd: (name: string, category: GroceryCategory) => void;
}

// "QUICK ADD · YOUR STAPLES" chip row. Staples are OFFERED, not auto-added
// (scope open-Q #2); a tap adds the item with the staple's stored category.
export function StaplesRow({ onList, onAdd }: StaplesRowProps) {
  const staplesQuery = trpc.staples.list.useQuery();
  const staples = (staplesQuery.data ?? []).filter(
    (s) => s.isActive && !onList.has(s.name.trim().toLowerCase())
  );

  if (staples.length === 0) return null;

  return (
    <div data-testid="staples-row">
      <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground">
        Quick add · Your staples
      </h2>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-0.5">
        {staples.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onAdd(s.name, s.category)}
            data-testid="staple-chip"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(240,222,190,0.08)] bg-[rgba(240,222,190,0.06)] px-3.5 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:border-[rgba(240,222,190,0.15)]"
          >
            <Plus className="size-3.5 text-primary" strokeWidth={2.4} />
            {capitalizeName(s.name)}
          </button>
        ))}
      </div>
    </div>
  );
}
