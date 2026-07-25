"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  deriveHouseholdSize,
  type BabyStage,
  type HouseholdComposition,
} from "@/lib/household";
import { ChefStatus } from "./chef-presence";
import { CountRow, PrimaryAction, QuietAction } from "./answer-controls";
import { CaughtTray, TellMeField } from "./tell-me-field";

// The baby follow-up. The locked design captures a single "babies under 2"
// count, which is too coarse to act on: a 3-month-old is milk-only and invisible
// to meal planning, a 9-month-old eats adapted bites of the family dinner, an
// 18-month-old eats the meal itself. That difference changes both the cooking
// guidance and the serving count, so it's worth one extra tap — asked ONLY when
// there's a baby, inside the note the design already reveals (Griffin, S36).
const BABY_STAGES: Array<{ value: BabyStage; label: string }> = [
  { value: "under_6m", label: "Under 6 months" },
  { value: "6_to_12m", label: "6 to 12 months" },
  { value: "12_to_24m", label: "12 to 24 months" },
];

function babyNote(stage: BabyStage | null | undefined): string {
  switch (stage) {
    case "under_6m":
      return "Not on solids yet, so I'll plan your meals normally and leave the little one to you.";
    case "12_to_24m":
      return "I'll make sure part of each dinner works for them: soft, low-salt, cut small.";
    case "6_to_12m":
      return "I'll flag first-foods textures and skip choking hazards for the little one.";
    default:
      return "Tell me how old, and I'll cook around it.";
  }
}

export interface HouseholdScreenProps {
  onConfirm: (composition: HouseholdComposition) => void;
  onSkip: () => void;
  onFreeText: (text: string) => void;
  onMicTap: () => void;
  talkPending: boolean;
  caught: string[];
}

export function HouseholdScreen({
  onConfirm,
  onSkip,
  onFreeText,
  onMicTap,
  talkPending,
  caught,
}: HouseholdScreenProps) {
  const [composition, setComposition] = useState<HouseholdComposition>(
    DEFAULT_HOUSEHOLD_COMPOSITION
  );

  const patch = (p: Partial<HouseholdComposition>) =>
    setComposition((c) => ({ ...c, ...p }));

  const hasBabies = composition.babies > 0;
  // Don't let a stale stage ride along if the babies count goes back to zero.
  const stage = hasBabies ? composition.babyStage ?? null : null;
  const servings = deriveHouseholdSize({ ...composition, babyStage: stage });

  return (
    <div className="animate-turn-in">
      <ChefStatus label="GETTING TO KNOW YOU" />

      <h2 className="m-0 mb-4 mt-4 text-[26px] font-bold leading-[1.2] tracking-[-0.5px] text-foreground">
        Who am I cooking for?
      </h2>

      <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[rgba(26,24,22,0.6)]">
        <CountRow
          label="Adults"
          value={composition.adults}
          min={1}
          max={12}
          onChange={(adults) => patch({ adults })}
          testId="onboarding-count-adults"
        />
        <div className="mx-[18px] h-px bg-white/[0.07]" />
        <CountRow
          label="Children"
          sub="Ages 2 to 12"
          value={composition.children}
          min={0}
          max={12}
          onChange={(children) => patch({ children })}
          testId="onboarding-count-children"
        />
        <div className="mx-[18px] h-px bg-white/[0.07]" />
        <CountRow
          label="Babies under 2"
          sub="First foods"
          value={composition.babies}
          min={0}
          max={6}
          onChange={(babies) =>
            patch({ babies, babyStage: babies > 0 ? composition.babyStage : null })
          }
          testId="onboarding-count-babies"
        />
      </div>

      {hasBabies && (
        <div
          data-testid="onboarding-baby-stage"
          className="animate-turn-in mt-3 rounded-[14px] border border-[rgba(232,148,74,0.22)] bg-[rgba(232,148,74,0.07)] px-3.5 py-3"
        >
          <div className="flex items-start gap-2.5">
            <Shield
              className="mt-px size-[15px] flex-none text-[#F2B279]"
              strokeWidth={1.9}
            />
            <p className="m-0 text-[12.5px] leading-[1.45] text-[#E8DFD3]">
              {babyNote(stage)}
            </p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BABY_STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => patch({ babyStage: s.value })}
                aria-pressed={stage === s.value}
                data-testid={`onboarding-baby-stage-${s.value}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  stage === s.value
                    ? "border-[rgba(232,148,74,0.6)] bg-[rgba(232,148,74,0.2)] text-[#F5E6D6]"
                    : "border-[rgba(232,148,74,0.28)] bg-transparent text-[#C7B8A8] hover:bg-[rgba(232,148,74,0.1)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <CaughtTray items={caught} />

      <TellMeField
        example="Two of us and a 9 month old"
        onSubmit={onFreeText}
        onMicTap={onMicTap}
        isSubmitting={talkPending}
      />

      <PrimaryAction
        label="That's my household"
        onClick={() => onConfirm({ ...composition, babyStage: stage })}
        testId="onboarding-confirm-household"
      />

      <p className="mt-2.5 text-center text-[12px] text-[#6B6B72]">
        I&apos;ll cook for {servings} {servings === 1 ? "serving" : "servings"}.
      </p>

      <div className="mt-1 flex justify-center">
        <QuietAction
          label="Skip this question"
          tone="faint"
          onClick={onSkip}
          testId="onboarding-skip-question"
        />
      </div>
    </div>
  );
}
