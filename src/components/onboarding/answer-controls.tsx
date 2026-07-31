"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/lib/onboarding/types";

export interface OptionCardsProps {
  options: QuestionOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

// Two-column cards — the locked layout for categorical answers with a sub-line
// (cook time, heat, effort). Tapping is always a complete path.
export function OptionCards({ options, selected, onToggle }: OptionCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            data-testid={`onboarding-option-${o.value}`}
            className={cn(
              "flex flex-col items-start rounded-[16px] border px-4 py-3.5 text-left transition-colors",
              on
                ? "border-[var(--spec-action)]/60 bg-[var(--spec-action)]/15"
                : "border-[rgba(240,222,190,0.10)] bg-[rgba(240,222,190,0.04)] hover:bg-[rgba(240,222,190,0.07)]"
            )}
          >
            <span className="text-[16px] font-semibold leading-[1.15] text-[var(--spec-text-primary)]">
              {o.label}
            </span>
            {o.sub && (
              <span className="mt-1 text-[12px] text-[var(--spec-text-muted)]">{o.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface OptionChipsProps {
  options: QuestionOption[];
  selected: string[];
  onToggle: (value: string) => void;
  // "safety" gives the selected state the You tab's red weight instead of the
  // blue accent. On the never-cook-with turn, a chosen allergen that looks
  // exactly like a chosen diet drops the one distinction the screen exists to
  // make — and the very next screen recaps those same items in red.
  tone?: "default" | "safety";
}

// Wrapping chips — the locked layout for multi-select (diet, cuisines,
// proteins, goals).
export function OptionChips({
  options,
  selected,
  onToggle,
  tone = "default",
}: OptionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            data-testid={`onboarding-option-${o.value}`}
            className={cn(
              "rounded-full border px-4 py-2.5 text-[0.9rem] font-medium transition-colors",
              !on && "border-[rgba(240,222,190,0.10)] bg-[rgba(240,222,190,0.04)] text-[var(--spec-text-primary)]/90 hover:bg-[rgba(240,222,190,0.07)]",
              on &&
                (tone === "safety"
                  ? "border-[rgba(217,106,91,0.55)] bg-[rgba(217,106,91,0.16)] text-[#F0D8D3]"
                  : "border-[var(--spec-action)]/60 bg-[var(--spec-action)]/15 text-[var(--spec-text-primary)]")
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface PrimaryActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}

// The blue confirm that ends every turn.
export function PrimaryAction({ label, onClick, disabled, testId }: PrimaryActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--spec-action)] px-4 py-4 text-[16px] font-semibold text-[var(--spec-action-on)] shadow-[0_10px_28px_-10px_rgba(244,235,220,0.3)] transition-opacity disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export interface QuietActionProps {
  label: string;
  onClick: () => void;
  tone?: "normal" | "faint";
  testId?: string;
}

// The pass / "I'm good for now" / "skip this question" row under the confirm.
// Skipping is first-class in this flow, so these are always reachable and never
// styled as a punishment.
export function QuietAction({ label, onClick, tone = "normal", testId }: QuietActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "px-2 py-2 font-semibold transition-colors",
        tone === "normal"
          ? "text-[14px] text-[var(--spec-text-body)] hover:text-[var(--spec-text-primary)]"
          : "text-[12.5px] text-[var(--spec-text-caption)] hover:text-[var(--spec-text-muted)]"
      )}
    >
      {label}
    </button>
  );
}
