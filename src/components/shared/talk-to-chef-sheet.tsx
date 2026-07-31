"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { FreeformField } from "@/components/shared/freeform-field";

export interface TalkToChefSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
  suggestions: string[];
  headline: string;
  initialText?: string;
  placeholder?: string;
  workingLabel?: string;
  modifyError?: string | null;
  // The chef's reply after a successful submit (e.g. a query-only ask like
  // "what am I out of"). Shown in-sheet so the answer isn't lost on close.
  resultMessage?: string | null;
}

// Shared natural-language "talk to the chef" bottom sheet. Presentational: it
// owns only the draft text; the caller owns the submit/mutation. Used by both the
// Plan tab (modify the week) and the Groceries tab (add/query the list).
export function TalkToChefSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  suggestions,
  headline,
  initialText,
  placeholder,
  workingLabel,
  modifyError,
  resultMessage,
}: TalkToChefSheetProps) {
  const [text, setText] = useState(initialText ?? "");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset/prefill the field on the closed→open transition, adjusting state
  // during render (React's recommended pattern) rather than in an effect.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setText(initialText ?? "");
  }

  const canSubmit = text.trim().length > 0 && !isSubmitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(text.trim());
  }

  // modal={false} + noBodyStyles — same rationale as ExpandedMealSheet: two
  // vaul drawers in the same tree fight over body pointer-events after close,
  // which can leave the page un-clickable.
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      noBodyStyles
    >
      <DrawerContent className="glass-sheet">
        <DrawerHeader className="text-left pr-12">
          <DrawerTitle className="text-lg">{headline}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Tell your chef what you&apos;re thinking.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-8">
          {suggestions.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setText(s)}
                  disabled={isSubmitting}
                  className="shrink-0 rounded-full border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.05)] px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-[rgba(240,222,190,0.1)] disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Spec §09: one control, speak or type, and inside a sheet it sits
              at the bottom of the sheet. The suggestion chips above are
              shortcuts INTO this field, not a second input. */}
          <FreeformField
            value={text}
            onChange={setText}
            onSubmit={handleSubmit}
            placeholder={placeholder ?? "Tell me what you're thinking this week…"}
            inputAriaLabel="Tell the chef in your own words"
            isSubmitting={isSubmitting}
            autoFocus
            inputTestId="chef-sheet-input"
            sendTestId="chef-sheet-send"
          />

          {/* Pending stays IN the open sheet (closes on success, not on submit)
              so a request never feels like it did nothing. */}
          {isSubmitting ? (
            <div aria-live="polite">
              <p className="text-sm text-primary/90">
                {workingLabel ?? "Reworking your plan…"}
              </p>
              <div className="shimmer-bar mt-2 h-0.5 w-full rounded-full" />
            </div>
          ) : modifyError ? (
            <p className="text-sm text-destructive/90" role="alert">
              {modifyError}
            </p>
          ) : (
            resultMessage && (
              <p className="text-sm text-primary/90" aria-live="polite">
                {resultMessage}
              </p>
            )
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
