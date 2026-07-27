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
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Your chef
      </p>
      <h1 className="mb-4 text-[1.75rem] font-bold leading-[1.12] tracking-[-0.5px] text-foreground">
        {isNew ? "We've just met." : "Here's what I know about you."}
      </h1>

      <div className="glass-surface rounded-[21px] px-[18px] pb-4 pt-[18px]">
        <p className="text-[0.97rem] leading-[1.55] text-foreground [text-wrap:pretty]">
          {narrative}
        </p>
        {!isNew && (
          <p className="mt-3 text-[0.8rem] leading-normal text-muted-foreground">
            All of this is editable. The fastest way to fix it is to just tell me.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenChef}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-primary py-3.5 text-[0.95rem] font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(58,134,255,0.6)] transition-colors hover:bg-primary/90"
      >
        <Mic className="size-[18px]" strokeWidth={2} />
        Talk to the chef
      </button>
      <p className="mx-1.5 mt-2 text-center text-[0.8rem] leading-snug text-muted-foreground [text-wrap:pretty]">
        {isNew
          ? "The more you tell me now, the better your first week. Or just start cooking and I'll pick it up."
          : "“I'm not pescatarian anymore, and I'm allergic to gluten” — I'll update everything at once."}
      </p>
    </div>
  );
}
