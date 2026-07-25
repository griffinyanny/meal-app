"use client";

import { ArrowRight } from "lucide-react";
import { ChefPresence } from "./chef-presence";

export interface DeepenOfferScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

// The opt-in gate for the adaptive deep round. The offer has to be honest in
// both directions: the plan really is good enough now, AND more really does make
// it better. Declining is a full-width button beside the accept, not a link
// hidden underneath, because "just build my week" is a legitimate answer rather
// than a failure to convert.
export function DeepenOfferScreen({ onAccept, onDecline }: DeepenOfferScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Top-anchored like every other turn, and carrying the chef mark: this
          is the one screen where the chef asks for more of your time, so it is
          the last screen that should read as an anonymous interstitial. */}
      <div className="animate-turn-in">
        <div className="mb-[18px] flex items-center gap-3">
          <ChefPresence />
          <p className="m-0 text-[11px] font-semibold tracking-[2px] text-[#F2B279]">
            THAT&apos;S THE ESSENTIALS
          </p>
        </div>
        <h2 className="m-0 mb-2.5 text-[27px] font-bold leading-[1.16] tracking-[-0.5px] text-foreground text-pretty">
          Want to go a little deeper?
        </h2>
        <p className="m-0 max-w-[335px] text-[15.5px] leading-[1.5] text-[#C7C7CC] text-pretty">
          I can plan a good week right now. A few more minutes and I&apos;ll cook to
          your spice, your timing, the flavors you actually reach for.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <button
          type="button"
          onClick={onAccept}
          data-testid="onboarding-deepen-yes"
          className="flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-primary px-4 py-[17px] text-[16px] font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgba(58,134,255,0.7)]"
        >
          Let&apos;s keep going
          <ArrowRight className="size-[18px]" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={onDecline}
          data-testid="onboarding-deepen-no"
          className="w-full rounded-[15px] border border-white/10 bg-white/[0.04] px-4 py-[15px] text-[15px] font-semibold text-[#C7C7CC] transition-colors hover:bg-white/[0.07]"
        >
          Just build my week
        </button>
      </div>
    </div>
  );
}
