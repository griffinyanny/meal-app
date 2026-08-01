"use client";

import { Minus, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeComposition,
  type BabyStage,
  type HouseholdComposition,
} from "@/lib/household";

export { normalizeComposition };

// BUG-011 · ONE CONTROL FOR "WHO AM I COOKING FOR", SHARED BY BOTH SURFACES.
//
// Extracted from the onboarding household screen when the You tab stopped
// editing a bare servings number and started editing the composition itself.
// Two surfaces editing the same fact through two different controls is how they
// drift, and drift here put two contradictory numbers in one chef prompt:
// "Default servings: 4" beside "Cooking for 2 adults and 1 baby".
//
// Controlled on purpose. The onboarding screen holds a draft it confirms at the
// end of the turn; the You tab sheet holds one it saves on tap. Owning state in
// here would force one of those two into the other's shape.

// The baby follow-up. A single "babies under 2" count is too coarse to act on:
// a 3-month-old is milk-only and invisible to meal planning, a 9-month-old eats
// adapted bites of the family dinner, an 18-month-old eats the meal itself.
// That difference changes both the cooking guidance and the serving count, so
// it's worth one extra tap — asked ONLY when there's a baby (Griffin, S36).
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

export interface CountRowProps {
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  testId?: string;
}

// One band of the household question. The locked design stacks three of these
// in a single grouped card with hairline dividers.
export function CountRow({
  label,
  sub,
  value,
  min,
  max,
  onChange,
  testId,
}: CountRowProps) {
  return (
    <div className="flex items-center gap-3.5 px-[18px] py-[15px]">
      <div className="flex-1">
        {/* Row title (spec §10): the name of a thing in a list, paired with the
            12.5px meta beneath. Was 16px, which is off the ladder in both
            directions — §12 item 07's exact complaint. */}
        <div className="spec-row-title">{label}</div>
        {sub && <div className="mt-0.5 spec-meta text-[var(--spec-text-muted)]">{sub}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`One fewer ${label.toLowerCase()}`}
          className="flex size-9 items-center justify-center rounded-[12px] border border-[rgba(240,222,190,0.12)] bg-[rgba(240,222,190,0.06)] text-[var(--spec-text-primary)] disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span
          data-testid={testId}
          className="min-w-5 text-center text-[19px] font-bold tabular-nums text-[var(--spec-text-primary)]"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`One more ${label.toLowerCase()}`}
          className="flex size-9 items-center justify-center rounded-[12px] border border-[rgba(240,222,190,0.12)] bg-[rgba(240,222,190,0.06)] text-[var(--spec-text-primary)] disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export interface HouseholdComposerProps {
  value: HouseholdComposition;
  onChange: (next: HouseholdComposition) => void;
  /**
   * Prefix for the test ids (`onboarding` / `you`). The interview's specs have
   * asserted on `onboarding-count-adults` and `onboarding-baby-stage-*` since
   * 1E, so the ids are part of this component's contract, not decoration.
   */
  idPrefix: string;
}

export function HouseholdComposer({
  value,
  onChange,
  idPrefix,
}: HouseholdComposerProps) {
  const patch = (p: Partial<HouseholdComposition>) =>
    onChange(normalizeComposition({ ...value, ...p }));

  const hasBabies = value.babies > 0;
  const stage = hasBabies ? value.babyStage ?? null : null;

  return (
    <>
      <div className="overflow-hidden rounded-[18px] spec-control">
        <CountRow
          label="Adults"
          value={value.adults}
          min={1}
          max={12}
          onChange={(adults) => patch({ adults })}
          testId={`${idPrefix}-count-adults`}
        />
        <div className="mx-[18px] h-px bg-[rgba(240,222,190,0.07)]" />
        <CountRow
          label="Children"
          sub="Ages 2 to 12"
          value={value.children}
          min={0}
          max={12}
          onChange={(children) => patch({ children })}
          testId={`${idPrefix}-count-children`}
        />
        <div className="mx-[18px] h-px bg-[rgba(240,222,190,0.07)]" />
        <CountRow
          label="Babies under 2"
          sub="First foods"
          value={value.babies}
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
              babyStage: babies > 0 ? value.babyStage ?? "6_to_12m" : null,
            })
          }
          testId={`${idPrefix}-count-babies`}
        />
      </div>

      {hasBabies && (
        <div
          data-testid={`${idPrefix}-baby-stage`}
          className="animate-turn-in mt-3 rounded-[14px] border border-[rgba(233,179,72,0.22)] bg-[rgba(233,179,72,0.07)] px-3.5 py-3"
        >
          <div className="flex items-start gap-2.5">
            <Shield
              className="mt-px size-[15px] flex-none text-[var(--spec-gold-tint)]"
              strokeWidth={1.9}
            />
            <p className="m-0 spec-meta text-[var(--spec-text-body)]">
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
                data-testid={`${idPrefix}-baby-stage-${s.value}`}
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
    </>
  );
}
