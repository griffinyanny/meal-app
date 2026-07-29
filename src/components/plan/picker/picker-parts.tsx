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
      <p className="m-0 mb-2.5 text-[10px] font-semibold tracking-[1.5px] text-[var(--spec-text-caption)]">
        WAYS THROUGH
      </p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            data-testid="picker-tile"
            onClick={() => onOpen(t.key)}
            className="spec-inset rounded-[14px] px-[14px] py-3 text-left"
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
  constraint,
}: {
  count: number;
  constraint: SlotConstraint | null;
}) {
  if (count === 0) return null;
  const fit = constraint
    ? ` — you've got ${constraint.maxMinutes} minutes.`
    : ". Let's spend one this week.";
  return (
    <div className="px-4 pb-3">
      <p className="m-0 mb-2 text-[10px] font-semibold tracking-[1.5px] text-[var(--spec-text-caption)]">
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
      onClick={onToggle}
      className={cn(
        "spec-inset flex min-h-[56px] w-full items-center gap-3 rounded-[14px] px-[14px] py-3 text-left",
        unfittable && "opacity-55"
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
 * No illustration, no "oops", no disabled search — the person did nothing wrong
 * and the product works fine without a library. It says what the surface is FOR
 * in the future tense, then hands back the action that works today. The two doors
 * are the same 56px rows the full picker uses, so the empty state teaches the
 * shape of the full one.
 */
export function EmptyLibrary({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="px-4 pb-5">
      <p className="m-0 mb-1.5 text-[16px] font-semibold text-[var(--spec-text-primary)]">
        Nothing in here yet.
      </p>
      <p
        className="m-0 mb-4 text-[13.5px] italic leading-[1.45] text-[var(--spec-gold-voice)]"
        style={{ textWrap: "pretty" }}
      >
        This is where recipes land once you keep them. The week doesn&apos;t need
        it — I&apos;ll write you five dinners without a single saved thing.
      </p>
      <div className="mb-4 flex flex-col gap-2">
        <SheetRow
          label="Paste a recipe or a link"
          sublabel="I'll read it and keep it"
          href="/recipes"
        />
        <SheetRow
          label="Look through the recipes tab"
          sublabel="Keep anything and it shows up here"
          href="/recipes"
        />
      </div>
      <button
        type="button"
        data-testid="picker-empty-primary"
        onClick={onGenerate}
        className="h-[52px] w-full rounded-[16px] bg-[var(--spec-action)] text-[15px] font-semibold text-[var(--spec-action-on)]"
      >
        Let the chef write it
      </button>
    </div>
  );
}
