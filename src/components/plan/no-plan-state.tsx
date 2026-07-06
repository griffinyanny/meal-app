"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export interface NoPlanStateProps {
  onGenerate: (request?: string) => void;
  isGenerating: boolean;
}

const SUGGESTIONS = [
  "Healthy weeknight dinners",
  "I want to grill",
  "Kid-friendly meals",
  "Use what's in my fridge",
  "Dinner party Saturday",
];

export function NoPlanState({ onGenerate, isGenerating }: NoPlanStateProps) {
  const [text, setText] = useState("");
  const canSubmit = text.trim().length > 0 && !isGenerating;

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          What are you thinking this week?
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell me what you&apos;re in the mood for, or I&apos;ll figure it out.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onGenerate(s)}
            disabled={isGenerating}
            className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-foreground/90 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or just start talking — what sounds good?"
          rows={3}
          disabled={isGenerating}
          className="min-h-24 resize-none bg-white/5 pr-12 text-base"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
              onGenerate(text.trim());
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => onGenerate(text.trim())}
          disabled={!canSubmit}
          aria-label="Send to chef"
          className="absolute bottom-2.5 right-2.5 size-9 rounded-full"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => onGenerate(undefined)}
        disabled={isGenerating}
        className="text-sm text-primary/90 transition-colors hover:text-primary disabled:opacity-60"
      >
        Or let your chef figure it out →
      </button>
    </div>
  );
}
