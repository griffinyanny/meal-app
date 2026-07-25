"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { ChefPresence } from "./chef-presence";
import { reflectHook, reflectSummary } from "@/lib/onboarding/synthesize";
import { isAllergyRestriction, restrictionLabel } from "@/components/you/constraint-utils";
import type { InterviewState } from "@/lib/onboarding/types";

export interface ReflectScreenProps {
  state: InterviewState;
  onBuildPlan: () => void;
  isSaving: boolean;
  // Answers whose save didn't land, in the user's terms. Empty is the normal
  // case; anything here means this screen must not say "All saved" (BUG-016).
  unsaved: string[];
}

// "and" rather than a bare comma list: this line is an apology, and it should
// read like a sentence a person would say.
function joinAnswers(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// "Here's what I'm thinking" — the payoff turn. It leads with an OPINION (a dish
// the chef is already picturing), not a receipt of the form you filled in,
// because the whole promise of the product is a cook with a point of view.
// The red recap underneath inherits the You tab's safety vocabulary exactly:
// same wording, same weight, same allergy sub-label, because these are the same
// objects the You tab will show you tomorrow.
export function ReflectScreen({
  state,
  onBuildPlan,
  isSaving,
  unsaved,
}: ReflectScreenProps) {
  const restrictions = state.restrictions;

  return (
    <div className="flex flex-1 flex-col">
      <div className="animate-turn-in flex flex-1 flex-col justify-center">
        <div className="mb-[18px] flex items-center gap-3">
          <ChefPresence />
          <p className="m-0 text-[11px] font-semibold tracking-[2px] text-[#F2B279]">
            HERE&apos;S WHAT I&apos;M THINKING
          </p>
        </div>

        <div className="glass-surface rounded-[22px] px-5 pb-[18px] pt-5">
          <p
            data-testid="onboarding-reflect-hook"
            className="m-0 mb-3 text-[19px] font-semibold leading-[1.45] text-foreground text-pretty"
          >
            {reflectHook(state)}
          </p>
          <p className="m-0 text-[15px] leading-[1.5] text-[#C7C7CC] text-pretty">
            {reflectSummary(state)}
          </p>
        </div>

        {restrictions.length > 0 && (
          <div className="mt-2.5 rounded-[16px] border border-[rgba(255,69,58,0.26)] bg-[rgba(255,69,58,0.07)] px-[15px] py-[13px]">
            <div className="mb-2.5 flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-destructive" strokeWidth={2} />
              <span className="text-[12.5px] font-bold text-[#FF6961]">
                I&apos;ll never cook with
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {restrictions.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[rgba(255,69,58,0.34)] bg-[rgba(255,69,58,0.14)] px-2.5 py-1.5 text-[13px] font-semibold text-[#FFD9D6]"
                >
                  {restrictionLabel(r)}
                  {isAllergyRestriction(r) && (
                    <span className="text-[10.5px] font-semibold text-[rgba(255,217,214,0.7)]">
                      allergy
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {unsaved.length > 0 ? (
          <p
            data-testid="onboarding-unsaved-note"
            className="m-0 mt-4 px-0.5 text-[14px] leading-[1.5] text-[#F2B279] text-pretty"
          >
            One thing: {joinAnswers(unsaved)} didn&apos;t save. I&apos;ll try again
            when you build your week.
          </p>
        ) : (
          <p className="m-0 mt-4 px-0.5 text-[14px] leading-[1.5] text-muted-foreground text-pretty">
            All saved. Change any of it anytime in{" "}
            <span className="font-semibold text-primary">You</span>.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onBuildPlan}
        disabled={isSaving}
        data-testid="onboarding-build-plan"
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-primary px-4 py-[17px] text-[16px] font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_rgba(58,134,255,0.75)] disabled:opacity-60"
      >
        {isSaving ? "Saving what you told me…" : "Plan my first week"}
        {!isSaving && <ArrowRight className="size-[19px]" strokeWidth={2.2} />}
      </button>
    </div>
  );
}
