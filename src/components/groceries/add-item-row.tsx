"use client";

import { useState } from "react";
import { Plus, ArrowUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddItemRowProps {
  // "top" is an always-open field; "bottom" is a dashed affordance that opens on tap.
  variant: "top" | "bottom";
  onAdd: (name: string) => void;
  // When set (top variant only), renders the "Talk to the Chef" brain button —
  // the natural-language add/query entry point.
  onOpenChef?: () => void;
  "data-testid"?: string;
}

// Free-form quick-add. Type anything, press Enter (or tap the arrow) to add it —
// the item lands optimistically and an AI tidy sorts it into the right aisle. The
// bottom variant stays open after a submit so a quick run of items keeps going.
export function AddItemRow({ variant, onAdd, onOpenChef, ...rest }: AddItemRowProps) {
  const testId = rest["data-testid"];
  const [active, setActive] = useState(variant === "top");
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
    // Top field clears and stays; bottom stays open for the next item.
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && variant === "bottom") {
      setText("");
      setActive(false);
    }
  }

  if (variant === "bottom" && !active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        data-testid={testId}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-3.5 text-left text-sm font-medium text-muted-foreground hover:border-white/25 hover:text-foreground"
      >
        <Plus className="size-[18px]" />
        Add an item
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl px-3.5 py-3",
        variant === "top"
          ? "glass-card"
          : "border border-primary/50 bg-[rgba(34,34,42,0.7)]"
      )}
    >
      <Plus className="size-[18px] shrink-0 text-primary" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (variant === "bottom" && !text.trim()) setActive(false);
        }}
        autoFocus={variant === "bottom"}
        placeholder={variant === "top" ? "Add an item…" : "Add an item — I'll sort it"}
        data-testid={testId}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      {variant === "top" && onOpenChef && !text.trim() ? (
        <button
          type="button"
          onClick={onOpenChef}
          aria-label="Talk to the chef"
          data-testid="grocery-open-chef"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-primary"
        >
          <Brain className="size-[18px]" strokeWidth={1.8} />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Add item"
          className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <ArrowUp className="size-[15px]" />
        </button>
      )}
    </div>
  );
}
