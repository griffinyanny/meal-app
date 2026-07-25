"use client";

import { Minus, Plus } from "lucide-react";
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
                ? "border-primary/60 bg-primary/15"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            )}
          >
            <span className="text-[16px] font-semibold leading-[1.15] text-foreground">
              {o.label}
            </span>
            {o.sub && (
              <span className="mt-1 text-[12px] text-[rgba(235,235,245,0.5)]">{o.sub}</span>
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
              !on && "border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.07]",
              on &&
                (tone === "safety"
                  ? "border-[rgba(255,69,58,0.55)] bg-[rgba(255,69,58,0.16)] text-[#FFD9D6]"
                  : "border-primary/60 bg-primary/15 text-foreground")
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
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
        <div className="text-[16px] font-semibold text-foreground">{label}</div>
        {sub && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`One fewer ${label.toLowerCase()}`}
          className="flex size-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06] text-foreground disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span
          data-testid={testId}
          className="min-w-5 text-center text-[19px] font-bold tabular-nums text-foreground"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`One more ${label.toLowerCase()}`}
          className="flex size-9 items-center justify-center rounded-[11px] border border-white/[0.12] bg-white/[0.06] text-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
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
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[15px] bg-primary px-4 py-4 text-[16px] font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgba(58,134,255,0.7)] transition-opacity disabled:opacity-40"
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
          ? "text-[14px] text-[#C7C7CC] hover:text-foreground"
          : "text-[12.5px] text-[#6B6B72] hover:text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
