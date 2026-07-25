"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export interface NoPlanStateProps {
  onGenerate: (request?: string) => void;
  isGenerating: boolean;
  // Present when re-prompting over an existing plan (vs. the first-run empty
  // state). `onCancel` returns to the current plan; `replaceWarning` tells the
  // user generating will replace a confirmed week.
  onCancel?: () => void;
  replaceWarning?: boolean;
  // Arriving straight from the onboarding interview (Phase 1E #4). This IS the
  // hand-off surface — the interview deliberately ends in the real intent
  // screen, pre-filled, rather than a bespoke onboarding step that would fork
  // the app into two ways of starting a week.
  seed?: {
    request?: string;
    chips: string[];
  };
}

const SUGGESTIONS = [
  "Healthy weeknight dinners",
  "I want to grill",
  "Kid-friendly meals",
  "Use what's in my fridge",
  "Dinner party Saturday",
];

export function NoPlanState({
  onGenerate,
  isGenerating,
  onCancel,
  replaceWarning,
  seed,
}: NoPlanStateProps) {
  const [text, setText] = useState(seed?.request ?? "");
  const canSubmit = text.trim().length > 0 && !isGenerating;

  return (
    <div className="space-y-6 py-2">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isGenerating}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          ← Keep current plan
        </button>
      )}

      {seed && (
        <p className="text-[11px] font-semibold tracking-[2px] text-primary">
          YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME
        </p>
      )}

      <div className="space-y-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {seed ? "Here's what I'll cook around." : "What are you thinking this week?"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {seed
            ? "Change anything, or let me get started."
            : "Tell me what you're in the mood for, or I'll figure it out."}
        </p>
      </div>

      {/* The visible proof that the interview fed the plan — these are the
          constraints just captured, shown before a single meal is generated. */}
      {seed && seed.chips.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="plan-seed-chips">
          {seed.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.8rem] font-medium text-foreground/90"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {replaceWarning && (
        <p className="text-xs text-muted-foreground">
          Generating a new plan will replace this week&apos;s meals.
        </p>
      )}

      {/* Generic starters would compete with the seed chips right above them
          and invite the user to discard what they just told the chef. */}
      {!seed && (
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
      )}

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

      {seed ? (
        <button
          type="button"
          onClick={() => onGenerate(text.trim() || undefined)}
          disabled={isGenerating}
          data-testid="plan-build-first-week"
          className="w-full rounded-[15px] bg-primary px-4 py-4 text-[16px] font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_rgba(58,134,255,0.75)] disabled:opacity-60"
        >
          Build my first week
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onGenerate(undefined)}
          disabled={isGenerating}
          className="text-sm text-primary/90 transition-colors hover:text-primary disabled:opacity-60"
        >
          Or let your chef figure it out →
        </button>
      )}
    </div>
  );
}
