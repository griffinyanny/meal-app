"use client";

import { useState } from "react";
import { Search, Plus, Sparkles, Link2 } from "lucide-react";

export type RecipeHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onGenerate: () => void;
  onImport: () => void;
};

/**
 * The Recipes list header (Phase 1E.5 · W10, frame `3l` — spec §12 item 04's
 * floating-primary half, pulled forward from 1F).
 *
 * REPLACES the floating search-and-plus toolbar. Two rules force it: pattern B
 * says search is never a floating object, and §D allows exactly one floating
 * layer above the tab bar — which the detail screen now spends on `Add to this
 * week`. A search pill and a FAB were occupying that slot for a screen whose
 * primary action is not on this tab at all.
 *
 * `＋` becomes an icon button beside the field rather than disappearing: it is
 * still the only way to create a recipe, it just stops floating.
 */
export function RecipeHeader({
  searchQuery,
  onSearchChange,
  onGenerate,
  onImport,
}: RecipeHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2.5">
      <label className="spec-inset flex flex-1 items-center gap-2.5 rounded-[14px] px-3.5 py-2.5">
        <Search
          aria-hidden
          className="size-4 flex-none stroke-[var(--spec-text-muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search recipes"
          aria-label="Search recipes"
          data-testid="recipe-search"
          className="w-full bg-transparent text-[14px] text-[var(--spec-text-body)] placeholder:text-[var(--spec-text-muted)] focus:outline-none"
        />
      </label>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            data-testid="create-menu"
            className="glass-sheet absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-2xl p-1.5 shadow-[0_18px_46px_-14px_rgba(0,0,0,0.75)]"
          >
            <MenuItem
              icon={<Sparkles className="size-4 text-primary" />}
              label="Generate"
              testid="create-generate"
              onClick={() => {
                setMenuOpen(false);
                onGenerate();
              }}
            />
            <MenuItem
              icon={<Link2 className="size-4 text-primary" />}
              label="Import URL"
              testid="create-import"
              onClick={() => {
                setMenuOpen(false);
                onImport();
              }}
            />
          </div>
        </>
      )}

      {/* 44px, per spec §12 item 05's metrics floor — this control shrank from a
          54px FAB, and shrinking it past the hit-target minimum would trade one
          spec violation for another.

          SECONDARY, NOT PRIMARY (S55, the S48 critic's deferred finding). As a
          filled cream square it was the loudest object on the screen, which
          made manual recipe entry outrank the tab's actual job — browsing what
          you already have. §08 allows exactly one filled cream button per
          viewport, and this tab spends that budget on the detail screen's
          `Add to this week`. `.spec-control-cream` IS the spec's `action.soft`
          rung (.1 fill / .32 line, cream label), so this is a route to an
          existing class rather than a new treatment. */}
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="New recipe"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        data-testid="recipe-add"
        className="spec-control-cream grid size-11 flex-none place-items-center rounded-[14px] text-[var(--spec-action)] transition-transform active:scale-95"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  testid,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  testid: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-testid={testid}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[rgba(240,222,190,0.05)]"
    >
      {icon}
      {label}
    </button>
  );
}
