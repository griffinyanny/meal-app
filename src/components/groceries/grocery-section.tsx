"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type GroceryCategory } from "@/lib/grocery-categories";
import type { GroceryItem } from "./use-grocery-mutations";
import { GroceryRow } from "./grocery-row";

interface GrocerySectionProps {
  category: GroceryCategory;
  items: GroceryItem[];
  onToggleCheck: (itemId: string, isChecked: boolean) => void;
  onEdit: (itemId: string, patch: { name?: string; qtyText?: string }) => void;
  onSplit: (itemId: string) => void;
}

// One aisle section in grouped mode. The whole section is drag-sortable (via the
// header grip) so the user can arrange aisles into their own store's order; the
// items inside don't move here (that's manual mode).
export function GrocerySection({
  category,
  items,
  onToggleCheck,
  onEdit,
  onSplit,
}: GrocerySectionProps) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } =
    useSortable({ id: category });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("mt-6", isDragging && "opacity-40")}
      data-testid="grocery-section"
      data-category={category}
    >
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Drag ${CATEGORY_LABELS[category]} section`}
            className="touch-none text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-[15px]" />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground">
            {CATEGORY_LABELS[category]}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground/60">{items.length}</span>
      </div>

      <div className="glass-card overflow-hidden">
        {items.map((item, i) => (
          <GroceryRow
            key={item.id}
            item={item}
            isFirst={i === 0}
            onToggleCheck={onToggleCheck}
            onEdit={onEdit}
            onSplit={onSplit}
          />
        ))}
      </div>
    </div>
  );
}
