"use client";

import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChefPresenceProps {
  // "hero" is the intro's full presence with steam and a floating bob; "inline"
  // is the small ember that sits beside the question status label on every turn.
  size?: "hero" | "inline";
  className?: string;
}

// The chef, present. The locked 1D direction replaced a cold assistant orb with
// an ember + steam, so the thing asking you questions reads as a cook at a stove
// rather than a form with a mascot. Purely decorative: every animation here is
// disabled under prefers-reduced-motion (see globals.css) and no information is
// carried by motion alone.
export function ChefPresence({ size = "inline", className }: ChefPresenceProps) {
  const hero = size === "hero";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex flex-none items-center justify-center",
        hero ? "size-28 ember-float" : "size-[50px]",
        className
      )}
    >
      {hero && (
        <>
          <span className="ember-ring absolute size-28 rounded-full border border-[rgba(232,148,74,0.4)]" />
          <span className="ember-steam absolute left-[44px] top-1.5 h-5 w-2 rounded-full" />
          <span
            className="ember-steam absolute left-[58px] top-1 h-[18px] w-[7px] rounded-full"
            style={{ animationDelay: "0.9s" }}
          />
        </>
      )}
      <span
        className={cn(
          "ember-core absolute rounded-full",
          hero ? "size-[88px]" : "size-[42px]"
        )}
      />
      <ChefHat
        className={cn("relative z-10 text-[#3A1D0E] opacity-85", hero ? "size-9" : "size-[21px]")}
        strokeWidth={1.7}
      />
    </div>
  );
}

export interface ChefStatusProps {
  label: string;
  // The safety turn carries a second, red line — the same "the one I have to get
  // right" weight the You tab gives restrictions.
  safety?: boolean;
}

// The eyebrow beside the inline ember. All-caps eyebrow is the app's rule.
export function ChefStatus({ label, safety }: ChefStatusProps) {
  return (
    <div className="flex items-center gap-[13px]">
      <ChefPresence />
      <div>
        <p
          className={cn(
            "m-0 text-[10px] font-semibold tracking-[1.5px]",
            safety ? "text-[#FF6961]" : "text-[#F2B279]"
          )}
        >
          {label}
        </p>
        {safety && (
          <p className="mt-[3px] text-[10px] font-semibold tracking-[1.5px] text-[#FF6961]">
            THE ONE I HAVE TO GET RIGHT
          </p>
        )}
      </div>
    </div>
  );
}
