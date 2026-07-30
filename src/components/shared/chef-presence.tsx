"use client";

import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChefPresenceProps {
  // "hero" is the intro's full presence with steam and a floating bob; "inline"
  // is the small ember beside the question status label on every interview turn;
  // "header" is Plan's 34px orb in the chef block at the top of the week;
  // "toast" is the 20px ember that rides in the acknowledgement bar.
  size?: "hero" | "inline" | "header" | "toast";
  // The live presence dot (Plan only). Gold, because presence is the chef being
  // here — the same reason the orb is gold.
  presenceDot?: boolean;
  // Runs the ember fast while the chef is writing. Motion only: the state is
  // always also carried in words by the header's status label, so nothing is
  // communicated by animation alone (and it stops under reduced-motion).
  thinking?: boolean;
  className?: string;
}

// The chef, present. The locked 1D direction replaced a cold assistant orb with
// an ember + steam, so the thing asking you questions reads as a cook at a stove
// rather than a form with a mascot. Purely decorative: every animation here is
// disabled under prefers-reduced-motion (see globals.css) and no information is
// carried by motion alone.
export function ChefPresence({
  size = "inline",
  presenceDot,
  thinking,
  className,
}: ChefPresenceProps) {
  const hero = size === "hero";
  // Below ~40px the toque's hairline stroke goes sub-pixel and reads as dirt,
  // so the two small sizes drop it and are pure ember.
  const small = size === "header" || size === "toast";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex flex-none items-center justify-center",
        hero && "size-28 ember-float",
        size === "inline" && "size-[50px]",
        size === "header" && "size-[34px]",
        size === "toast" && "size-5",
        className
      )}
    >
      {hero && (
        <>
          <span className="ember-ring absolute size-28 rounded-full border border-[rgba(233,179,72,0.4)]" />
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
          hero && "size-[88px]",
          size === "inline" && "size-[42px]",
          size === "header" && "size-[34px]",
          size === "toast" && "size-5",
          thinking && "ember-thinking"
        )}
      />
      {/* The toque (spec §02). A hairline stroke, never a fill — a filled toque
          is a sticker, a line drawing is a silhouette seen through flame. Sized
          to 41% of the sphere and seated just below centre so the highlight
          stays clear above the brim and the light still reads as coming from
          up-left. Below 40px the stroke goes sub-pixel and reads as dirt, which
          is why the small sizes drop it entirely rather than shrinking it. */}
      {!small && (
        <ChefHat
          className={cn(
            "relative z-10 text-[#2A1C04] opacity-85",
            hero ? "size-9" : "size-[17px]"
          )}
          strokeWidth={1.6}
        />
      )}
      {presenceDot && (
        <span className="absolute -bottom-px -right-px size-[9px] rounded-full border-2 border-[var(--spec-floor)] bg-[var(--spec-gold)]" />
      )}
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
            safety ? "text-[var(--spec-destructive-text)]" : "text-[var(--spec-gold-tint)]"
          )}
        >
          {label}
        </p>
        {safety && (
          <p className="mt-[3px] text-[10px] font-semibold tracking-[1.5px] text-[var(--spec-destructive-text)]">
            THE ONE I HAVE TO GET RIGHT
          </p>
        )}
      </div>
    </div>
  );
}
