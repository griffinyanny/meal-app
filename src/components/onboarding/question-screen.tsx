"use client";

import { useState } from "react";
import { ChefStatus } from "./chef-presence";
import {
  OptionCards,
  OptionChips,
  PrimaryAction,
  QuietAction,
} from "./answer-controls";
import { CaughtTray, TellMeField } from "./tell-me-field";
import type { AnswerKind, QuestionOption } from "@/lib/onboarding/types";

export interface QuestionScreenProps {
  // Identity of the turn. Changing it resets the local selection, which is what
  // makes one component safely serve every question in the flow.
  questionId: string;
  status: string;
  headline: string;
  why?: string;
  kind: AnswerKind;
  multi: boolean;
  options: QuestionOption[];
  example: string;
  confirmLabel: string;
  // The safety turn gets the red weight and an easy, explicit pass.
  safety?: boolean;
  passLabel?: string;
  onPass?: () => void;
  // Present during the deep round: the always-available exit.
  onGoodForNow?: () => void;
  onSkipQuestion?: () => void;
  onConfirm: (values: string[]) => void;
  onFreeText: (text: string) => void;
  onMicTap: () => void;
  talkPending: boolean;
  caught: string[];
  meter?: number;
}

// The repeating unit of the interview. One layout, no modes: tappable answers
// on top, "or just tell me" underneath, confirm at the bottom. Every core
// question after household and every adaptive deep question renders through
// here, which is what keeps the flow feeling like one conversation instead of
// a sequence of differently-shaped forms.
export function QuestionScreen({
  questionId,
  status,
  headline,
  why,
  kind,
  multi,
  options,
  example,
  confirmLabel,
  safety,
  passLabel,
  onPass,
  onGoodForNow,
  onSkipQuestion,
  onConfirm,
  onFreeText,
  onMicTap,
  talkPending,
  caught,
  meter,
}: QuestionScreenProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);

  // A new question means a fresh answer — without this, a selection would leak
  // from one turn into the next. Render-time reset (the same pattern
  // field-edit-sheet uses) rather than an effect, so the new question never
  // paints for a frame carrying the previous turn's selection.
  if (questionId !== prevQuestionId) {
    setPrevQuestionId(questionId);
    setSelected([]);
  }

  function toggle(value: string) {
    setSelected((prev) => {
      if (!multi) return prev.includes(value) ? [] : [value];
      return prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
    });
  }

  return (
    <div className="animate-turn-in">
      {meter !== undefined && (
        <div className="mb-[18px]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="max-w-[270px] text-[10.5px] font-semibold leading-[1.3] tracking-[1.2px] text-muted-foreground">
              THE MORE YOU TELL ME, THE BETTER YOUR PLANS GET
            </span>
            <span className="text-[11px] font-semibold text-[#F2B279]">Optional</span>
          </div>
          {/* The testid lives on the TRACK, which is always rendered. The fill
              is legitimately zero-width on the first deep question (the meter
              measures signal captured, not questions survived), and a
              zero-width element is invisible to both users and assertions. */}
          <div
            data-testid="onboarding-value-meter"
            className="h-[5px] overflow-hidden rounded-[3px] bg-white/[0.08]"
          >
            <div
              data-testid="onboarding-value-meter-fill"
              className="h-full rounded-[3px] bg-[#F2B279] transition-[width] duration-500"
              style={{ width: `${Math.round(meter * 100)}%` }}
            />
          </div>
        </div>
      )}

      <ChefStatus label={status} safety={safety} />

      <h2 className="m-0 mb-3.5 mt-4 text-[26px] font-bold leading-[1.2] tracking-[-0.5px] text-foreground text-pretty">
        {headline}
      </h2>

      {why && (
        <p className="m-0 mb-4 text-[13px] italic leading-[1.45] text-muted-foreground">
          {why}
        </p>
      )}

      {kind === "cards" ? (
        <OptionCards options={options} selected={selected} onToggle={toggle} />
      ) : (
        <OptionChips options={options} selected={selected} onToggle={toggle} />
      )}

      <CaughtTray items={caught} />

      <TellMeField
        example={example}
        onSubmit={onFreeText}
        onMicTap={onMicTap}
        isSubmitting={talkPending}
      />

      {selected.length > 0 && (
        <PrimaryAction
          label={confirmLabel}
          onClick={() => onConfirm(selected)}
          testId="onboarding-confirm"
        />
      )}

      <div className="mt-3 flex flex-col items-center gap-0.5">
        {onPass && passLabel && (
          <QuietAction label={passLabel} onClick={onPass} testId="onboarding-pass" />
        )}
        {onGoodForNow && (
          <QuietAction
            label="I'm good for now, build my week"
            tone="faint"
            onClick={onGoodForNow}
            testId="onboarding-good-for-now"
          />
        )}
        {onSkipQuestion && (
          <QuietAction
            label="Skip this question"
            tone="faint"
            onClick={onSkipQuestion}
            testId="onboarding-skip-question"
          />
        )}
      </div>
    </div>
  );
}
