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
// — when an item was merged across meals (sources > 1) — a neutral count marker
// ("2 dinners") that IS the disclosure control, opening the per-meal breakdown
// with a "Split into separate items" action (the inline merge-review; see
// decisions.md, under-merge + inline review).
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
        !isFirst && "border-t border-[rgba(240,222,190,0.05)]",
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
            // A CHECKED item is a completion, not an action. B5 ruled the
            // cooked/complete check keeps a hue and that hue is #9CB86F; this
            // one had stayed cream, so the same screen said "done" in the
            // action colour on a row and in the success colour in its header.
            item.isChecked
              ? "border-[var(--spec-success)] bg-[var(--spec-success)]"
              : "border-[rgba(240,222,190,0.3)] bg-transparent"
          )}
        >
          {item.isChecked && (
            <Check className="size-[13px] text-[var(--spec-floor)]" strokeWidth={3} />
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
              className="w-full rounded-md bg-primary/15 px-1.5 py-0.5 spec-input font-medium outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => beginEdit("name")}
              aria-label={`Edit ${capitalizeName(item.name)}`}
              className="block w-full cursor-text text-left spec-row-title"
            >
              {capitalizeName(item.name)}
            </button>
          )}
          {meta &&
            editing !== "name" &&
            (merged ? (
              // The merge marker: a neutral inset carrying the count as type.
              // It used to be an amber dot plus an amber meta line, and amber is
              // the chef (§01) — a merge is a mechanical fact about the list, so
              // amber said the chef was speaking when the chef was not. The
              // count also says strictly more than the dot did: "2 dinners"
              // names what this opens, where a dot only said "something here".
              //
              // It IS the disclosure control, not a label beside one. Law 05:
              // fill + border ⇒ it must respond to a tap. The first pass drew
              // this as an inert chip with a separate chevron alongside, which
              // put a pill on something decorative — the exact thing law 05
              // forbids. Folding the two together also deletes a control and
              // puts the affordance on the words that describe it.
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label="Show what was combined"
                aria-expanded={expanded}
                className="mt-1 inline-flex items-center gap-1 rounded-md border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.07)] py-0.5 pl-1.5 pr-1 text-[11px] font-semibold text-muted-foreground"
                data-testid="grocery-merge-marker"
              >
                {meta}
                <ChevronDown
                  className={cn("size-3 transition-transform", expanded && "rotate-180")}
                />
              </button>
            ) : (
              <p className="mt-0.5 spec-meta text-muted-foreground">{meta}</p>
            ))}
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
            className="w-[72px] shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-right spec-input outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => beginEdit("qty")}
            className={cn(
              "shrink-0 rounded-md bg-[rgba(240,222,190,0.04)] px-1.5 py-0.5 text-[13px]",
              qtyLabel ? "text-muted-foreground" : "text-muted-foreground/45"
            )}
          >
            {qtyLabel || "qty"}
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
              <span className="spec-meta text-foreground/80">
                {source.recipeTitle}
              </span>
              <span className="spec-meta text-muted-foreground">
                {[source.qty, source.unit].filter(Boolean).join(" ")}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSplit(item.id)}
            className="mt-2 rounded-[12px] border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.05)] px-3 py-1.5 text-[12px] font-semibold hover:bg-[rgba(240,222,190,0.08)]"
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
