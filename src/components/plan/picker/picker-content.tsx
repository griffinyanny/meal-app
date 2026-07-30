"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { RecipeListItem } from "@/components/recipes/types";
import { SheetBody, SheetStatus } from "../sheet/sheet-parts";
import { BrowseTiles, EmptyLibrary, PickerRow, StaleLine } from "./picker-parts";
import { MAX_PICKS_PER_ASK } from "@/lib/plan/pick-limits";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import {
  browseTiles,
  fittingCount,
  openingList,
  pickReceipt,
  pickVerb,
  savedNeverCooked,
  tileContents,
  tileHeading,
  toPickerRecipe,
  type SlotConstraint,
  type TileKey,
} from "./picker-helpers";

/**
 * How the picker was opened. ONE PICKER, THREE INVOCATIONS (ledger §A, `3e`):
 * intent screen, a day, a meal. **Only the first line and the primary change** —
 * everything below is identical, which is the test the frame sets for itself.
 */
export interface PickerInvocation {
  /** `3b` "Cook something you've saved" · `3e` "Thursday dinner, from your recipes". */
  headline: string;
  /** `3e`'s subline: what is being displaced. Absent on the intent screen. */
  subline?: string | null;
  /** Names the destination in the primary, when there is one. */
  dayName?: string | null;
  /**
   * The night being displaced, ISO. Sent to the server so the chef knows that
   * night is free — it is a fact about the week, not an instruction about where
   * the pick goes. The chef still answers with the night (§B).
   */
  replacingDate?: string | null;
  /** The night's ceiling — dims what cannot fit and swaps one browse tile. */
  constraint?: SlotConstraint | null;
}

export interface PickerContentProps {
  invocation: PickerInvocation;
  /**
   * Titles come back with the ids because the intent screen has to SHOW what was
   * chosen before any week exists, and it has no other route to the name — the
   * picker is the only surface that has read the library.
   */
  onConfirm: (picks: { id: string; title: string }[]) => void;
  onGenerate: () => void;
  isWorking: boolean;
  workingLabel?: string;
  error?: string | null;
}

export function PickerContent({
  invocation,
  onConfirm,
  onGenerate,
  isWorking,
  workingLabel,
  error,
}: PickerContentProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tile, setTile] = useState<TileKey | null>(null);

  // The picker reads the library the Recipes tab already fetched — the same
  // cached `recipe.list` query, so opening it costs nothing on a warm tab and
  // one request on a cold one. Build dependency 1 wanted a real staleness query,
  // and `lastCookedAt` + `sourcePlanId` are both already on these rows.
  const listQuery = trpc.recipe.list.useQuery();
  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  const constraint = invocation.constraint ?? null;
  const tiles = useMemo(
    () => browseTiles(items, constraint),
    [items, constraint]
  );

  const term = query.trim().toLowerCase();
  // The opening tier, capped at the frame's own three-plus-more (`3b`). The
  // stale COUNT stays the full tier — the chef's line counts what is waiting,
  // not what fit above the fold — and the hidden remainder gets a door.
  const opening = useMemo(() => openingList(items), [items]);

  const visible: RecipeListItem[] = useMemo(() => {
    if (term) {
      // SEARCH STAYS INSIDE THE ROOM IT IS STANDING IN. This used to search
      // `everything` while the heading kept naming the pushed tile, so typing
      // inside `Cooked before` returned recipes that had never been cooked
      // under a heading that said they had. A door is a door because the room
      // behind it has walls; a field that reaches through them makes the tile
      // decoration, which is exactly the "place, not a dropdown" claim §A rests
      // on. `Everything` is one tap away for the person who wants the library.
      return tileContents(items, tile ?? "everything", constraint).filter((r) =>
        r.title.toLowerCase().includes(term)
      );
    }
    return tile ? tileContents(items, tile, constraint) : opening.shown;
  }, [items, term, tile, constraint, opening]);

  const rows = useMemo(
    () => visible.map((r) => toPickerRecipe(r, constraint)),
    [visible, constraint]
  );

  // The chef's opening line counts the whole waiting tier and how much of it
  // fits the named night — computed over the tier, not the capped slice, so the
  // sentence and the rows can never disagree again (S48, critic's finding).
  const staleTier = useMemo(
    () => savedNeverCooked(items).map((r) => toPickerRecipe(r, constraint)),
    [items, constraint]
  );

  const libraryEmpty = !listQuery.isLoading && tiles.every((t) => t.count === 0);

  // §B's answer to too many picks is a CONVERSATION (frame `3m`) — a
  // recommendation and its alternative, in the chef's voice. That is a separate
  // screen and is deferred, so this is the honest interim: the ceiling holds,
  // and the surface says so in one line instead of letting the person select a
  // fifth and meet a generic failure from the server's own limit.
  const atLimit = selected.length >= MAX_PICKS_PER_ASK;

  function toggle(id: string) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= MAX_PICKS_PER_ASK) return s;
      return [...s, id];
    });
  }

  const heading =
    tile != null
      ? (tileHeading(tile, tiles) ?? invocation.headline)
      : invocation.headline;

  // The receipt: which selected picks are which, in the one line that can still
  // name them when the second checkbox is scrolled out of sight. Titles resolve
  // against the same list the confirm handler uses.
  const selectedTitles = selected
    .map((id) => items.find((r) => r.id === id)?.title)
    .filter((t): t is string => t != null);

  // Whether the single named-night pick overruns the night. Computed against
  // the source list, not the rows on screen — the selection can outlive the
  // view it was made in (select inside a pushed door, then step back out).
  const soloPickOverruns =
    selected.length === 1 &&
    (() => {
      const r = items.find((x) => x.id === selected[0]);
      return r != null && toPickerRecipe(r, constraint).unfittableReason != null;
    })();

  return (
    <>
      <SheetBody>
        {/* The header. `Clear` appears only with a selection, AS TYPE NOT A
            CONTROL (§A) — a permanently visible reset is a control competing
            with the primary for a job nobody has yet. */}
        <div className="px-4 pb-4 pt-1 pr-12">
          <div className="mb-1.5 flex items-baseline justify-between gap-2.5">
            {tile != null ? (
              <button
                type="button"
                onClick={() => setTile(null)}
                className="m-0 flex items-center gap-1 text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]"
              >
                <ArrowLeft aria-hidden className="size-2.5" strokeWidth={2.4} />
                YOUR RECIPES
              </button>
            ) : (
              <p className="m-0 text-[9.5px] font-bold tracking-[1.2px] text-[var(--spec-text-caption)]">
                YOUR RECIPES
              </p>
            )}
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-[11.5px] text-[var(--spec-text-caption)] underline underline-offset-2"
              >
                Clear
              </button>
            ) : null}
          </div>

          <DrawerTitle className="m-0 text-[22px] font-[650] leading-[1.28] tracking-[-0.3px] text-[var(--spec-text-feature)]">
            {heading}
          </DrawerTitle>
          {invocation.subline ? (
            <DrawerDescription className="m-0 mt-1 text-[13px] text-[var(--spec-text-caption)]">
              {invocation.subline}
            </DrawerDescription>
          ) : null}

          {/* SEARCH SITS IN THE SHEET HEADER (pattern B) — never a floating
              object, never disabled. On an EMPTY library it is not disabled,
              it is absent: frame `3d` omitted it deliberately, and a field
              over a set with nothing in it is a door onto nothing (S48). */}
          {!libraryEmpty ? (
            <label className="spec-inset mt-3.5 flex items-center gap-2.5 rounded-[18px] px-3.5 py-2.5">
              <Search
                aria-hidden
                className="size-4 flex-none stroke-[var(--spec-text-muted)]"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // The count is the useful part of this placeholder — except
                // while the query is still loading, where a literal `Search 0
                // recipes` would be §A's forbidden apology wearing a number.
                placeholder={
                  (tiles.find((t) => t.key === "everything")?.count ?? 0) > 0
                    ? `Search ${tiles.find((t) => t.key === "everything")?.count} recipes`
                    : "Search your recipes"
                }
                aria-label="Search your recipes"
                data-testid="picker-search"
                className="w-full bg-transparent text-[14px] text-[var(--spec-text-body)] placeholder:text-[var(--spec-text-muted)] focus:outline-none"
              />
            </label>
          ) : null}
        </div>

        {libraryEmpty ? (
          <EmptyLibrary onGenerate={onGenerate} />
        ) : (
          <>
            {/* STALENESS IS CONTENT, NOT A SORT ORDER (§A) — the chef says the
                one read only this product has, in italic, once, at the top. */}
            {tile == null && !term ? (
              <StaleLine
                count={staleTier.length}
                fitting={fittingCount(staleTier)}
                constraint={constraint}
              />
            ) : null}

            <div className="flex flex-col gap-2 px-4 pb-5" data-testid="picker-list">
              {rows.length === 0 ? (
                <p className="m-0 text-[13.5px] text-[var(--spec-text-muted)]">
                  {term
                    ? "Nothing here by that name."
                    : "Nothing in this one yet."}
                </p>
              ) : (
                rows.map((row) => (
                  <PickerRow
                    key={row.id}
                    title={row.title}
                    meta={row.unfittableReason ?? row.meta}
                    unfittable={row.unfittableReason != null}
                    checked={selected.includes(row.id)}
                    onToggle={() => toggle(row.id)}
                  />
                ))
              )}
              {/* Frame `3b`'s own cap: three rows, then the remainder as a door
                  into the full tier — so the browse doors below never sink. */}
              {tile == null && !term && opening.moreCount > 0 ? (
                <button
                  type="button"
                  data-testid="picker-more"
                  onClick={() => setTile("stale")}
                  className="py-1.5 text-left text-[13px] text-[var(--spec-text-caption)]"
                >
                  {opening.moreCount} more →
                </button>
              ) : null}
            </div>

            {/* BROWSE IS FOUR NAMED TILES WITH COUNTS — doors, not filter chips,
                and they PUSH (S43 call): a pushed view carries its own heading
                and count, which is what makes a tile a door. */}
            {tile == null && !term ? (
              <BrowseTiles tiles={tiles} onOpen={setTile} />
            ) : null}
          </>
        )}

        <SheetStatus
          working={isWorking ? (workingLabel ?? "Working it into your week…") : null}
          error={isWorking ? null : error}
        />
      </SheetBody>

      {/* NO ACTION BAR UNTIL SOMETHING IS SELECTED (§A) — an inert primary is a
          nag, and the floating slot is reserved for a real action.

          At 22px, not 96px: the 96px offset exists only to clear the tab bar,
          and a sheet already covers it. */}
      {selected.length > 0 ? (
        <div className="flex-none px-4 pb-[22px] pt-2">
          <p className="m-0 mb-2 text-center text-[12.5px] text-[var(--spec-text-caption)]">
            {atLimit
              ? "That's as many as I can build a week around."
              : invocation.dayName && selected.length === 1
                ? // One pick on a named night keeps `3e`'s promise. If the pick
                  // runs longer than the night allows, the overrule is theirs to
                  // make and the line says so out loud — a silent accept reads
                  // as the surface not having noticed (S48, critic's finding).
                  soloPickOverruns
                  ? "Runs long for the night — your call. I'll rebuild the shop around it."
                  : "I'll rebuild the shop around it."
                : selectedTitles.length >= 2
                  ? // THE RECEIPT (S48): with picks made across two sections the
                    // second checkbox is scrolled out of sight, and this is the
                    // only line on screen that can still name it. It stops
                    // restating the verb and says what `these` means.
                    pickReceipt(selectedTitles)
                  : "The chef picks the nights."}
          </p>
          <button
            type="button"
            data-testid="picker-confirm"
            disabled={isWorking}
            onClick={() =>
              onConfirm(
                selected.map((id) => ({
                  id,
                  title: items.find((r) => r.id === id)?.title ?? "Your recipe",
                }))
              )
            }
            className="h-[52px] w-full rounded-[16px] bg-[var(--spec-action)] text-[15px] font-semibold text-[var(--spec-action-on)] disabled:opacity-60"
          >
            {pickVerb(selected.length, invocation.dayName)}
          </button>
        </div>
      ) : null}
    </>
  );
}
