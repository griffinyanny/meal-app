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
  onFreeText: (text: string) => Promise<boolean>;
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
    // Top-anchored question, bottom-anchored actions (see question-screen): the
    // baby note revealing must not move the stepper the user is still tapping.
    <div className="animate-turn-in flex flex-1 flex-col">
      <ChefStatus label="GETTING TO KNOW YOU" />

      <h2 className="m-0 mb-4 mt-4 text-[26px] font-bold leading-[1.2] tracking-[-0.5px] text-[var(--spec-text-primary)]">
        Who am I cooking for?
      </h2>

      <div className="overflow-hidden rounded-[18px] spec-control">
        <CountRow
          label="Adults"
          value={composition.adults}
          min={1}
          max={12}
          onChange={(adults) => patch({ adults })}
          testId="onboarding-count-adults"
        />
        <div className="mx-[18px] h-px bg-[rgba(240,222,190,0.07)]" />
        <CountRow
          label="Children"
          sub="Ages 2 to 12"
          value={composition.children}
          min={0}
          max={12}
          onChange={(children) => patch({ children })}
          testId="onboarding-count-children"
        />
        <div className="mx-[18px] h-px bg-[rgba(240,222,190,0.07)]" />
        <CountRow
          label="Babies under 2"
          sub="First foods"
          value={composition.babies}
          min={0}
          max={6}
          // A revealed follow-up arrives with an answer already proposed, like
          // every other turn ("AI proposes, user reacts" — three empty chips
          // under a prompt is a blank form). 6-to-12 months is the conservative
          // guess: it's the stage that makes the chef flag choking hazards, and
          // the note above the chips narrates the assumption out loud, so the
          // chips read as a correction rather than a second question.
          onChange={(babies) =>
            patch({
              babies,
              babyStage:
                babies > 0 ? composition.babyStage ?? "6_to_12m" : null,
            })
          }
          testId="onboarding-count-babies"
        />
      </div>

      {hasBabies && (
        <div
          data-testid="onboarding-baby-stage"
          className="animate-turn-in mt-3 rounded-[14px] border border-[rgba(233,179,72,0.22)] bg-[rgba(233,179,72,0.07)] px-3.5 py-3"
        >
          <div className="flex items-start gap-2.5">
            <Shield
              className="mt-px size-[15px] flex-none text-[var(--spec-gold-tint)]"
              strokeWidth={1.9}
            />
            <p className="m-0 text-[12.5px] leading-[1.45] text-[var(--spec-text-body)]">
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
                // Cream, matching every other selected chip in the interview.
                // These were the one gold-control outlier in the flow: gold
                // marks the chef speaking, and a chip you tap is your hand, not
                // the chef's voice. The amber NOTE around them stays gold —
                // gold.soft is the chef's speech container and this is the chef
                // narrating an assumption it made.
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  stage === s.value
                    ? "border-[var(--spec-action)]/60 bg-[var(--spec-action)]/15 text-[var(--spec-text-primary)]"
                    : "border-[rgba(240,222,190,0.10)] bg-transparent text-[var(--spec-text-muted)] hover:bg-[rgba(240,222,190,0.07)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div aria-hidden className="mt-auto min-h-6" />

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
        // Same race as the shared question screen (BUG-015): a typed answer
        // still in flight can be overwritten by the confirm it was correcting.
        disabled={talkPending}
        testId="onboarding-confirm-household"
      />

      {/* Adding a 6-to-12-month-old deliberately doesn't move the serving count
          (they eat adapted bites, not a portion). Said plainly, because a
          number that refuses to change after a tap reads as a control that
          didn't register. */}
      <p className="mt-2.5 text-center text-[12px] text-[var(--spec-text-caption)]">
        I&apos;ll cook for {servings} {servings === 1 ? "serving" : "servings"}
        {stage === "6_to_12m" ? ", plus bites for the little one." : "."}
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
