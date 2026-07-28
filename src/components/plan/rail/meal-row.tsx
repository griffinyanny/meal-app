"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayMeal } from "../plan-helpers";
import {
  carriesRationale,
  formatDuration,
  markersOf,
  metaLine,
} from "../rail-helpers";

// Where a row sits. "solo" is a day with one meal, where the day container IS
// the card (frames 3i/3j/3o). "nested" is a day with two or more, where the
// container becomes an 8px shell holding 14px rows (frames 3h/3p).
//
// The distinction is not cosmetic: a solo row has the vertical room for its own
// meta line, a nested one does not, so a nested row puts the cook time on the
// baseline beside its eyebrow instead. Same facts, one less line.
export type RowDensity = "solo" | "nested";

export interface MealRowProps {
  meal: DisplayMeal;
  density: RowDensity;
  /** Draft rows argue for their placement; confirmed rows mostly don't (§D). */
  showRationale: boolean;
  /** The chef is rewriting this row — a gold ring on the row's own radius. */
  working?: boolean;
  /** One-shot highlight after a change lands. Gold: it marks the chef's work. */
  landed?: boolean;
  /** Provenance eyebrow — Slice 2 sets this for a recipe the user chose. */
  picked?: boolean;
  onOpen?: (meal: DisplayMeal) => void;
}

function Eyebrow({
  meal,
  picked,
  trailing,
}: {
  meal: DisplayMeal;
  picked?: boolean;
  trailing?: string | null;
}) {
  const markers = markersOf(meal);
  const label = [
    meal.mealType.toUpperCase(),
    meal.relative,
    picked ? "PICKED" : null,
    ...markers.map((m) => m.toUpperCase()),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-1 flex items-baseline justify-between gap-2.5">
      <p className="m-0 flex items-center gap-[5px] text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]">
        {picked ? (
          <Bookmark
            aria-hidden
            className="size-2.5 stroke-[var(--spec-text-muted)]"
            strokeWidth={2.4}
          />
        ) : null}
        {label}
      </p>
      {trailing ? (
        <span className="text-[11.5px] text-[var(--spec-text-caption)]">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The row that carries the chef's voice. Only dinner gets one (§D), which is
 * what keeps fifteen meals inside law 06's three-gold-mark budget.
 */
export function MealRowFeature({
  meal,
  density,
  showRationale,
  working,
  landed,
  picked,
  onOpen,
}: MealRowProps) {
  const solo = density === "solo";
  const rationale = showRationale && carriesRationale(meal.mealType) && meal.rationale;
  // A solo row has room for a meta line of its own; a nested one puts the time
  // on the eyebrow's baseline instead. Never both — that was BUG-008's shape.
  const meta = metaLine(meal);
  const showMetaLine = solo && !!meta;

  return (
    <button
      type="button"
      data-meal-date={meal.date}
      onClick={onOpen ? () => onOpen(meal) : undefined}
      disabled={!onOpen}
      aria-label={`Open ${meal.title ?? "this meal"}`}
      className={cn(
        "block w-full min-w-0 text-left font-[inherit] transition-shadow",
        solo
          ? "spec-glass rounded-[18px] px-[14px] pb-[14px] pt-[13px]"
          : "spec-inset rounded-[14px] px-3 pb-3 pt-[11px]",
        working && "shadow-[0_0_0_1.5px_rgba(233,179,72,0.42)]",
        landed && "animate-[landedRing_1.4s_ease-out_1]"
      )}
    >
      <Eyebrow
        meal={meal}
        picked={picked}
        trailing={
          !solo && meal.estTimeMinutes ? formatDuration(meal.estTimeMinutes) : null
        }
      />
      <p
        className={cn(
          "m-0 font-semibold leading-[1.25] text-[var(--spec-text-primary)]",
          solo ? "text-[16px]" : "text-[15.5px]"
        )}
      >
        {meal.title}
      </p>
      {showMetaLine ? (
        <p className="m-0 mt-1 text-[12.5px] text-[var(--spec-text-caption)]">
          {meta}
        </p>
      ) : null}
      {rationale ? (
        <p
          className={cn(
            "m-0 italic text-[var(--spec-gold-voice)]",
            solo
              ? "mt-1.5 text-[13.5px] leading-[1.45]"
              : "mt-1 text-[13px] leading-[1.4]"
          )}
        >
          {meal.rationale} →
        </p>
      ) : null}
    </button>
  );
}

/**
 * Lunch, breakfast, snack. A compact row cannot host the chef's voice (§C) —
 * which is precisely why the toast exists: the sentence goes there instead.
 */
export function MealRowCompact({
  meal,
  onOpen,
  working,
}: {
  meal: DisplayMeal;
  onOpen?: (meal: DisplayMeal) => void;
  working?: boolean;
}) {
  return (
    <button
      type="button"
      data-meal-date={meal.date}
      onClick={onOpen ? () => onOpen(meal) : undefined}
      disabled={!onOpen}
      aria-label={`Open ${meal.title ?? "this meal"}`}
      className={cn(
        "spec-inset flex w-full items-center gap-[9px] rounded-[14px] px-3 py-[9px] text-left font-[inherit] transition-shadow",
        working && "shadow-[0_0_0_1.5px_rgba(233,179,72,0.42)]"
      )}
    >
      <span className="w-[62px] flex-none text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]">
        {meal.mealType.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--spec-text-body)]">
        {meal.title}
      </span>
      {meal.estTimeMinutes ? (
        <span className="text-[11.5px] text-[#7A6C5D]">
          {formatDuration(meal.estTimeMinutes)}
        </span>
      ) : null}
    </button>
  );
}

/**
 * A slot with no answer yet — NEVER a spinner (BUG-009).
 *
 * The same object serves two reasons: mid-generation ("Friday, after Wednesday")
 * and deliberately undecided ("Not planned — you weren't sure about Saturday").
 * The user-facing fact is identical, so the treatment is too: nothing is planned
 * here and nothing was bought for it. It holds its height so resolving in place
 * changes text and fill only — nothing reflows.
 */
export function ProvisionalRow({
  meal,
  density,
  sentence,
  onDecide,
}: {
  meal: DisplayMeal;
  density: RowDensity;
  sentence: string;
  onDecide?: (meal: DisplayMeal) => void;
}) {
  if (density === "nested" && !onDecide) {
    return (
      <div className="spec-provisional flex min-h-10 items-center gap-[9px] rounded-[14px] px-3 py-[9px]">
        <span className="w-[62px] flex-none text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]">
          {meal.mealType.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-[14px] text-[var(--spec-text-muted)]">
          {sentence}
        </span>
      </div>
    );
  }

  const solo = density === "solo";
  return (
    <div
      className={cn(
        "spec-provisional",
        solo
          ? "flex min-h-[56px] items-center rounded-[18px] px-[14px] py-[13px]"
          : "rounded-[14px] px-3 pb-3 pt-[11px]"
      )}
    >
      <div className={solo && !onDecide ? "" : "w-full"}>
        {!solo ? (
          <div className="mb-1 flex items-baseline justify-between gap-2.5">
            <p className="m-0 text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]">
              {meal.mealType.toUpperCase()}
            </p>
          </div>
        ) : null}
        <p
          className={cn(
            "m-0 text-[14px] leading-[1.4] text-[var(--spec-text-muted)]",
            onDecide && "mb-2.5"
          )}
        >
          {sentence}
        </p>
        {onDecide ? (
          <button
            type="button"
            onClick={() => onDecide(meal)}
            className="spec-control-cream h-9 rounded-[12px] px-[13px] text-[13px] font-semibold text-[var(--spec-action)]"
          >
            Decide now
          </button>
        ) : null}
      </div>
    </div>
  );
}
