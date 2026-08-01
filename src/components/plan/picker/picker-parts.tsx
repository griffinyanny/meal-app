"use client";

import { cn } from "@/lib/utils";
import { SheetRow } from "../sheet/sheet-parts";
import type { BrowseTile, SlotConstraint, TileKey } from "./picker-helpers";

/**
 * BROWSE IS FOUR NAMED TILES WITH COUNTS — doors, not filter chips, and they
 * PUSH (S43 call): a pushed view carries its own heading and count, which is
 * what makes a tile a door rather than a filter.
 */
export function BrowseTiles({
  tiles,
  onOpen,
}: {
  tiles: BrowseTile[];
  onOpen: (key: TileKey) => void;
}) {
  return (
    <section className="px-4 pb-5">
      <p className="m-0 mb-2.5 spec-eyebrow">
        WAYS THROUGH
      </p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            data-testid="picker-tile"
            onClick={() => onOpen(t.key)}
            className="spec-inset rounded-[18px] px-[14px] py-3 text-left"
          >
            <span className="block text-[14px] font-medium text-[var(--spec-text-primary)]">
              {t.label}
            </span>
            <span className="mt-0.5 block text-[12px] text-[var(--spec-text-caption)]">
              {t.count} {t.count === 1 ? "recipe" : "recipes"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * The chef's one italic line about the stale end of the library.
 *
 * It is the FIRST thing on the surface and it is content: `3b` puts the product's
 * only genuinely private read — what you keep saving and never cook — in the
 * chef's voice rather than in a sort control nobody would press.
 */
export function StaleLine({
  count,
  fitting,
  constraint,
}: {
  count: number;
  /** How many of the tier fit the named night. Meaningless without a constraint. */
  fitting: number;
  constraint: SlotConstraint | null;
}) {
  if (count === 0) return null;

  // THE CHEF READS ITS OWN LIST (S48, critic's finding). Quoting the ceiling
  // while every row under it says `longer than Friday allows` is the chef
  // contradicting the rows it is standing on — so with a constraint the line
  // counts what actually fits, and only claims the ceiling when everything does.
  let fit: string;
  if (!constraint) {
    fit = ". Let's spend one this week.";
  } else if (fitting === count) {
    fit = ` — you've got ${constraint.maxMinutes} minutes.`;
  } else if (fitting === 0) {
    fit = ` — none of them fit ${constraint.dayName}'s ${constraint.maxMinutes} minutes.`;
  } else {
    fit = ` — ${fitting} of them ${fitting === 1 ? "fits" : "fit"} your ${constraint.maxMinutes} minutes.`;
  }

  return (
    <div className="px-4 pb-3">
      <p className="m-0 mb-2 spec-eyebrow">
        SAVED, NEVER COOKED
      </p>
      <p
        className="m-0 text-[13.5px] italic leading-[1.45] text-[var(--spec-gold-voice)]"
        style={{ textWrap: "pretty" }}
      >
        {count === 1
          ? `One of these has been waiting${fit}`
          : `${count} of these have been waiting${fit}`}
      </p>
    </div>
  );
}

export function PickerRow({
  title,
  meta,
  unfittable,
  checked,
  onToggle,
}: {
  title: string;
  meta: string;
  unfittable: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-testid="picker-row"
      data-unfittable={unfittable ? "true" : undefined}
      // An unfittable recipe is still selectable: the ledger dims it and states
      // the reason, which informs without overruling. The person may know the
      // lamb is worth moving the night for, and this surface does not get to
      // decide that for them.
      //
      // AND A SELECTED ONE UN-DIMS (S48, critic's finding): dimmed-and-checked
      // is the universal grammar for a disabled control that got stuck. The
      // overrule is allowed, so the row has to acknowledge it happened — the
      // reason stays on the row, the dim lifts.
      onClick={onToggle}
      className={cn(
        "spec-inset flex min-h-[56px] w-full items-center gap-3 rounded-[18px] px-[14px] py-3 text-left",
        unfittable && !checked && "opacity-55"
      )}
    >
      {/* SELECTION IS CREAM, NEVER GOLD (§A) — a checkbox is the user's act, and
          gold would read as the chef having chosen. 22px at r7 per the metrics
          floor. */}
      <span
        aria-hidden
        className={cn(
          "grid size-[22px] flex-none place-items-center rounded-[7px] border",
          checked
            ? "border-transparent bg-[var(--spec-action)]"
            : "border-[rgba(240,222,190,0.22)]"
        )}
      >
        {checked ? (
          <span className="text-[13px] font-bold leading-none text-[var(--spec-action-on)]">
            ✓
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium leading-[1.3] text-[var(--spec-text-primary)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--spec-text-caption)]">
          {meta}
        </span>
      </span>
    </button>
  );
}

/**
 * THE EMPTY LIBRARY DOES NOT APOLOGISE (§A, `3d`).
 *
 * No illustration, no "oops" — the person did nothing wrong and the product
 * works fine without a library. It says what the surface is FOR in the future
 * tense, then hands back the action that works today (`Let the chef write it`
 * stays the loud object on purpose: with nothing to pick, the honest answer is
 * that there is nothing to pick, and promoting data entry mid-planning sends
 * the person away from the week they came to build).
 *
 * S48, per the critic: the search field is gone (frame `3d` omitted it
 * deliberately — searching an empty set is a door onto nothing), the gold line
 * lost its middle clause (four lines of italic read as a paragraph, and law 06
 * grants a mark, not a passage), and the two doors became one honest one — both
 * went to `/recipes`, and `Paste a recipe or a link` promised an act this
 * surface cannot perform. One door, saying where it goes and what to do there.
 *
 * S48 follow-up, Griffin's capture read: `Let the chef write it` is NOT rendered
 * here. It lives in the pane's pinned footer beside the selection primary, so
 * the 80vh pane anchors its loudest object in ONE place across every state —
 * inline here and pinned there meant the button moved ~700px depending on
 * whether the library had anything in it. The copy also stopped promising
 * `five dinners` when no week exists yet and the app confirms seven: the count
 * is the request's to make, and a number the person can compare against what
 * they get is the BUG-041 class of copy, one size smaller.
 */
export function EmptyLibrary() {
  return (
    <div className="px-4 pb-5">
      <p className="m-0 mb-1.5 text-[16px] font-semibold text-[var(--spec-text-primary)]">
        Nothing in here yet.
      </p>
      <p
        className="m-0 mb-4 text-[13.5px] italic leading-[1.45] text-[var(--spec-gold-voice)]"
        style={{ textWrap: "pretty" }}
      >
        This is where recipes land once you keep them. I&apos;ll write you a week
        without a single saved thing.
      </p>
      <div className="flex flex-col gap-2">
        <SheetRow
          label="Look through the Recipes tab"
          sublabel="Paste a link there, or keep anything — it lands here"
          href="/recipes"
        />
      </div>
    </div>
  );
}
