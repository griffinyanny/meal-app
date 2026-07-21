"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { Check, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroceryItem } from "./use-grocery-mutations";
import { formatQty, capitalizeName, itemMeta } from "./grocery-format";

type SortableBits = Pick<
  ReturnType<typeof useSortable>,
  "setNodeRef" | "attributes" | "listeners"
>;

interface DragProps extends SortableBits {
  style: React.CSSProperties;
  isDragging: boolean;
}

interface GroceryRowProps {
  item: GroceryItem;
  isFirst: boolean;
  onToggleCheck: (itemId: string, isChecked: boolean) => void;
  onEdit: (itemId: string, patch: { name?: string; qtyText?: string }) => void;
  onSplit: (itemId: string) => void;
  drag?: DragProps;
}

// One shoppable list row: check off, tap the name or quantity to edit inline, and
// — when an item was merged across meals (sources > 1) — an amber dot + chevron
// that opens the per-meal breakdown with a "Split into separate items" action
// (the inline merge-review; see decisions.md, under-merge + inline review).
export function GroceryRow({
  item,
  isFirst,
  onToggleCheck,
  onEdit,
  onSplit,
  drag,
}: GroceryRowProps) {
  const [editing, setEditing] = useState<"name" | "qty" | null>(null);
  const [editText, setEditText] = useState("");
  const [expanded, setExpanded] = useState(false);
  // Guards against a double-commit: pressing Enter (or Escape) unmounts the input,
  // whose onBlur would otherwise fire commitEdit a second time from the prior
  // render's closure. Set once the edit session is handled; reset on beginEdit.
  const handledRef = useRef(false);

  const merged = (item.sources?.length ?? 0) > 1;
  const meta = itemMeta(item);
  const qtyLabel = formatQty(item.quantity, item.unit);

  function beginEdit(field: "name" | "qty") {
    handledRef.current = false;
    setEditing(field);
    setEditText(field === "name" ? capitalizeName(item.name) : qtyLabel);
  }
  function commitEdit() {
    if (!editing || handledRef.current) return;
    handledRef.current = true;
    const value = editText.trim();
    if (editing === "name") {
      if (value) onEdit(item.id, { name: value });
    } else {
      onEdit(item.id, { qtyText: value });
    }
    setEditing(null);
  }
  function onEditKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      // Cancel: mark handled so the unmount blur doesn't commit the discarded text.
      handledRef.current = true;
      setEditing(null);
    }
  }

  return (
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      className={cn(
        !isFirst && "border-t border-white/5",
        drag?.isDragging && "opacity-40"
      )}
      data-testid="grocery-row"
      data-checked={item.isChecked}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-opacity",
          item.isChecked && "opacity-50"
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={item.isChecked}
          aria-label={`Check off ${capitalizeName(item.name)}`}
          onClick={() => onToggleCheck(item.id, !item.isChecked)}
          className={cn(
            "flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors",
            item.isChecked
              ? "border-primary bg-primary"
              : "border-white/30 bg-transparent"
          )}
        >
          {item.isChecked && (
            <Check className="size-[13px] text-primary-foreground" strokeWidth={3} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {editing === "name" ? (
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={onEditKey}
              onBlur={commitEdit}
              autoFocus
              aria-label="Edit item name"
              className="w-full rounded-md bg-primary/15 px-1.5 py-0.5 text-[15px] font-medium outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => beginEdit("name")}
              aria-label={`Edit ${capitalizeName(item.name)}`}
              className="block w-full cursor-text text-left text-[15px] font-medium leading-snug"
            >
              {capitalizeName(item.name)}
              {merged && (
                <span
                  className="ml-1.5 inline-block size-1.5 rounded-full bg-[#FF9F0A] align-middle"
                  data-testid="grocery-merge-dot"
                  aria-hidden="true"
                />
              )}
            </button>
          )}
          {meta && editing !== "name" && (
            <p
              className={cn(
                "mt-0.5 text-[11.5px]",
                merged ? "text-[#FF9F0A]" : "text-muted-foreground"
              )}
            >
              {meta}
            </p>
          )}
        </div>

        {editing === "qty" ? (
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={onEditKey}
            onBlur={commitEdit}
            autoFocus
            placeholder="qty"
            aria-label="Edit quantity"
            className="w-[72px] shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-right text-[13px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => beginEdit("qty")}
            className={cn(
              "shrink-0 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[13px]",
              qtyLabel ? "text-muted-foreground" : "text-muted-foreground/45"
            )}
          >
            {qtyLabel || "qty"}
          </button>
        )}

        {merged && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Show what was combined"
            aria-expanded={expanded}
            className="shrink-0"
          >
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
        )}

        {drag && (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="shrink-0 touch-none text-muted-foreground"
            {...drag.attributes}
            {...drag.listeners}
          >
            <GripVertical className="size-[18px]" />
          </button>
        )}
      </div>

      {merged && expanded && (
        <div className="animate-in fade-in slide-in-from-top-1 px-4 pb-3.5 pl-12 duration-200">
          {(item.sources ?? []).map((source, i) => (
            <div
              key={`${source.recipeId}-${i}`}
              className="flex items-center justify-between py-1"
            >
              <span className="text-[12.5px] text-foreground/80">
                {source.recipeTitle}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {[source.qty, source.unit].filter(Boolean).join(" ")}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSplit(item.id)}
            className="mt-2 rounded-[10px] border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold hover:bg-white/[0.08]"
          >
            Split into separate items
          </button>
        </div>
      )}
    </div>
  );
}

// Manual-mode wrapper: makes a row drag-sortable (touch long-press or pointer).
// Grouped mode renders GroceryRow directly (rows don't move; sections do).
export function SortableGroceryRow(props: Omit<GroceryRowProps, "drag">) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } =
    useSortable({ id: props.item.id });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };
  return (
    <GroceryRow
      {...props}
      drag={{ setNodeRef, style, attributes, listeners, isDragging }}
    />
  );
}
