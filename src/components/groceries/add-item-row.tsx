"use client";

import { useState } from "react";
import { Plus, Brain } from "lucide-react";
import { FreeformField } from "@/components/shared/freeform-field";

interface AddItemRowProps {
  // "top" is an always-open field; "bottom" is a dashed affordance that opens on tap.
  variant: "top" | "bottom";
  onAdd: (name: string) => void;
  // When set (top variant only), renders the "Talk to the Chef" brain button —
  // the natural-language add/query entry point.
  onOpenChef?: () => void;
  "data-testid"?: string;
}

// Free-form quick-add. Type anything, press Enter (or tap send) to add it — the
// item lands optimistically and an AI tidy sorts it into the right aisle. The
// bottom variant stays open after a submit so a quick run of items keeps going.
//
// The field itself is the spec §09 control (`shared/freeform-field.tsx`). Two
// notes on what that changed here:
//
//  1. The chef launcher moved OUT of the field. It used to occupy the trailing
//     slot whenever the field was empty and swap to send once you typed — which
//     is the one thing §09 forbids by name ("the mic does not move or
//     disappear; nothing about starting to type should close the other door").
//     It sits beside the control now, and is always visible.
//  2. The leading `+` glyph is gone from the open field. §09's anatomy has no
//     leading icon — a muted glyph leading the value is header pattern B, which
//     is search, and §09 says search is not this control. The dashed rest state
//     keeps its `+`, because that is a button rather than the control.
//
// Both variants render the same control, but never two open fields at rest: the
// bottom one is a dashed button until tapped, so "one per screen" holds.
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

  if (variant === "bottom" && !active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        data-testid={testId}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[rgba(240,222,190,0.15)] px-4 py-3.5 text-left text-sm font-medium text-muted-foreground hover:border-[rgba(240,222,190,0.25)] hover:text-foreground"
      >
        <Plus className="size-[18px]" />
        Add an item
      </button>
    );
  }

  const field = (
    <FreeformField
      className="min-w-0 flex-1"
      value={text}
      onChange={setText}
      onSubmit={submit}
      placeholder={variant === "top" ? "Add an item…" : "Add an item — I'll sort it"}
      inputAriaLabel="Add an item to your list"
      autoFocus={variant === "bottom"}
      inputTestId={testId}
      sendTestId={variant === "top" ? "grocery-add-send" : "grocery-add-bottom-send"}
    />
  );

  if (variant === "top") {
    if (!onOpenChef) return field;
    return (
      <div className="flex items-start gap-2.5">
        {field}
        <button
          type="button"
          onClick={onOpenChef}
          aria-label="Talk to the chef"
          data-testid="grocery-open-chef"
          className="mt-1.5 flex size-11 flex-none items-center justify-center rounded-[12px] bg-primary/15 text-primary"
        >
          <Brain className="size-[19px]" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  // Escape and click-away collapse the bottom field back to its dashed rest
  // state. Handled on the wrapper rather than on the input: React's blur
  // bubbles, so `relatedTarget` can ask whether focus left the whole control —
  // an input-level onBlur would collapse the row the moment you tapped its own
  // mic, which is the one control in it that does not take focus back.
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setText("");
          setActive(false);
        }
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (!text.trim()) setActive(false);
      }}
    >
      {field}
    </div>
  );
}
