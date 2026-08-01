"use client";

import { Mic } from "lucide-react";

export interface ChefNarrativeCardProps {
  narrative: string;
  isNew: boolean;
  onOpenChef: () => void;
}

// The hero: the chef's read of you in its own voice + the primary AI-first capture
// entry point ("Talk to the chef"). The narrative is built from real preference
// data (see build-narrative), never lorem.
export function ChefNarrativeCard({ narrative, isNew, onOpenChef }: ChefNarrativeCardProps) {
  return (
    <div>
      <p className="mb-2.5 spec-eyebrow text-[var(--spec-gold-tint)]">
        Your chef
      </p>
      <h1 className="mb-4 spec-spoken-headline text-foreground">
        {isNew ? "We've just met." : "Here's what I know about you."}
      </h1>

      <div className="glass-surface rounded-[22px] px-[18px] pb-4 pt-[18px]">
        <p className="spec-body text-foreground">
          {narrative}
        </p>
        {!isNew && (
          <p className="mt-3 spec-meta text-muted-foreground">
            All of this is editable. The fastest way to fix it is to just tell me.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenChef}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-primary py-3.5 text-[0.95rem] font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(244,235,220,0.4)] transition-colors hover:bg-primary/90"
      >
        <Mic className="size-[18px]" strokeWidth={2} />
        Talk to the chef
      </button>
      <p className="mx-1.5 mt-2 text-center spec-meta text-muted-foreground [text-wrap:pretty]">
        {isNew
          ? "The more you tell me now, the better your first week. Or just start cooking and I'll pick it up."
          : "“I'm not pescatarian anymore, and I'm allergic to gluten” — I'll update everything at once."}
      </p>
    </div>
  );
}
