"use client";

import { useState } from "react";
import {
  DEFAULT_HOUSEHOLD_COMPOSITION,
  deriveHouseholdSize,
  type HouseholdComposition,
} from "@/lib/household";
import { ChefStatus } from "@/components/shared/chef-presence";
import {
  HouseholdComposer,
  normalizeComposition,
} from "@/components/shared/household-composer";
import { PrimaryAction, QuietAction } from "./answer-controls";
import { CaughtTray, TellMeField } from "./tell-me-field";

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

  const stage = composition.babyStage;
  const servings = deriveHouseholdSize(composition);

  return (
    // Top-anchored question, bottom-anchored actions (see question-screen): the
    // baby note revealing must not move the stepper the user is still tapping.
    <div className="animate-turn-in flex flex-1 flex-col">
      <ChefStatus label="GETTING TO KNOW YOU" />

      {/* ⚠️ BUG-063 · h1, not h2. Each interview screen is its own page — one
          renders at a time — and this line is that page's title. They all sat
          at h2, so every screen of the interview was a document with no
          level-one heading, which is what axe's `page-has-heading-one` caught
          once the a11y sweep finally visited onboarding. `intro-screen.tsx`
          already had it right, which is why the welcome screen passed. */}
      <h1 className="m-0 mb-4 mt-4 spec-spoken-headline text-[var(--spec-text-primary)]">
        Who am I cooking for?
      </h1>

      <HouseholdComposer
        value={composition}
        onChange={setComposition}
        idPrefix="onboarding"
      />

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
        onClick={() => onConfirm(normalizeComposition(composition))}
        // Same race as the shared question screen (BUG-015): a typed answer
        // still in flight can be overwritten by the confirm it was correcting.
        disabled={talkPending}
        testId="onboarding-confirm-household"
      />

      {/* Adding a 6-to-12-month-old deliberately doesn't move the serving count
          (they eat adapted bites, not a portion). Said plainly, because a
          number that refuses to change after a tap reads as a control that
          didn't register. */}
      <p className="mt-2.5 text-center spec-meta text-[var(--spec-text-caption)]">
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
