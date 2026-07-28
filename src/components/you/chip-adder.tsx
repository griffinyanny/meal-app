"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipAdderProps {
  onAdd: (value: string) => void;
  variant?: "danger" | "neutral";
  placeholder?: string;
  // Accessible name for the reveal button, e.g. "Add something you never cook with".
  label: string;
}

// Direct inline add for a constraint chip (feature #2 — never require a
// conversation to add). Tapping the dashed "Add" reveals a small text field;
// Enter or blur-with-text commits, Escape or empty-blur cancels.
export function ChipAdder({
  onAdd,
  variant = "neutral",
  placeholder = "Add…",
  label,
}: ChipAdderProps) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const danger = variant === "danger";

  function commit() {
    const v = value.trim();
    if (v) onAdd(v);
    setValue("");
    setAdding(false);
  }

  if (adding) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setValue("");
            setAdding(false);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "w-36 rounded-[12px] border bg-[rgba(240,222,190,0.06)] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground",
          danger ? "border-[rgba(217,106,91,0.4)]" : "border-[rgba(240,222,190,0.2)]"
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[12px] border border-dashed px-3 py-2 text-sm font-medium transition-colors",
        danger
          ? "border-[rgba(217,106,91,0.4)] text-[var(--spec-destructive-text)] hover:bg-[rgba(217,106,91,0.08)]"
          : "border-[rgba(240,222,190,0.2)] text-muted-foreground hover:bg-[rgba(240,222,190,0.04)]"
      )}
    >
      <Plus className="size-3.5" strokeWidth={2.4} />
      Add
    </button>
  );
}
