"use client";

import { ArrowRight, CheckSquare, Clock, Mic } from "lucide-react";
import { ChefPresence } from "./chef-presence";

export interface IntroScreenProps {
  onStart: () => void;
  onSkipAll: () => void;
  isSaving: boolean;
}

// What the app is, before it asks for anything. The three lines below are the
// app explainer 1A contributed to the locked 1D direction — a user who has
// never seen the product needs to know how it works before they start answering
// questions about their diet.
const POINTS = [
  { Icon: CheckSquare, text: "I propose, you react. Mostly just tapping." },
  { Icon: Mic, text: "Or tell me anything in plain words. I'll fold it in." },
  { Icon: Clock, text: "I remember it all. Change anything later in You." },
];

export function IntroScreen({ onStart, onSkipAll, isSaving }: IntroScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="animate-turn-in flex flex-1 flex-col justify-center">
        <ChefPresence size="hero" className="mb-5" />

        <p className="m-0 mb-3 text-[11px] font-semibold tracking-[2px] text-[#F2B279]">
          YOUR CHEF
        </p>
        <h1 className="m-0 mb-3 text-[28px] font-bold leading-[1.16] tracking-[-0.5px] text-foreground text-pretty">
          Let&apos;s get to know each other. Then I&apos;ll cook your week.
        </h1>
        <p className="m-0 mb-[22px] max-w-[335px] text-[15.5px] leading-[1.5] text-[#C7C7CC] text-pretty">
          I learn how you eat, then build a plan around it, not a template. Two minutes,
          and you can skip any of it.
        </p>

        <div className="flex flex-col gap-[13px]">
          {POINTS.map(({ Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-[rgba(232,148,74,0.14)]">
                <Icon className="size-[15px] text-[#F2B279]" strokeWidth={2} />
              </div>
              <p className="m-0 mt-0.5 text-[14.5px] leading-[1.4] text-[#E5E5EA]">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6">
        <button
          type="button"
          onClick={onStart}
          data-testid="onboarding-start"
          className="flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-primary px-4 py-[17px] text-[16px] font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgba(58,134,255,0.7)]"
        >
          Let&apos;s get started
          <ArrowRight className="size-[18px]" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={onSkipAll}
          disabled={isSaving}
          data-testid="onboarding-skip-all"
          className="w-full py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Skip for now, use sensible defaults
        </button>
      </div>
    </div>
  );
}
