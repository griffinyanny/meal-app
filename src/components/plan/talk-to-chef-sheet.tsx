"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export interface TalkToChefSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
  suggestions: string[];
  headline: string;
  initialText?: string;
}

export function TalkToChefSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  suggestions,
  headline,
  initialText,
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
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{headline}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Tell your chef what you&apos;re thinking for the week.
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
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell me what you're thinking this week…"
              rows={3}
              autoFocus
              disabled={isSubmitting}
              className="min-h-24 resize-none bg-white/5 pr-12 text-base"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label="Send to chef"
              className="absolute bottom-2.5 right-2.5 size-9 rounded-full"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>

          {isSubmitting && (
            <p className="text-sm text-muted-foreground">
              Reworking your plan…
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
