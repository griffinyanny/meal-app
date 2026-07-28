"use client";

import { useState } from "react";
import { Search, Plus, Sparkles, Link2 } from "lucide-react";

export type RecipeToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onGenerate: () => void;
  onImport: () => void;
};

// The floating bottom toolbar: a search pill + a circular "+" that opens the
// two creation entry points (Generate / Import URL). Sits just above the tab bar.
export function RecipeToolbar({
  searchQuery,
  onSearchChange,
  onGenerate,
  onImport,
}: RecipeToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-40 flex items-center gap-3"
      style={{
        bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <label className="glass-surface flex-1 flex items-center gap-2.5 rounded-full px-4 py-3 shadow-[0_18px_46px_-14px_rgba(0,0,0,0.75)]">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search recipes"
          aria-label="Search recipes"
          data-testid="recipe-search"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </label>

      <div className="relative shrink-0">
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-0 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              data-testid="create-menu"
              className="glass-sheet absolute bottom-[calc(100%+10px)] right-0 z-10 w-48 rounded-2xl p-1.5 shadow-[0_18px_46px_-14px_rgba(0,0,0,0.75)]"
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
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="New recipe"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="recipe-add"
          className="grid place-items-center size-[54px] rounded-full bg-primary text-primary-foreground shadow-[0_18px_46px_-14px_rgba(244,235,220,0.35)] active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="size-6" />
        </button>
      </div>
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
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left hover:bg-[rgba(240,222,190,0.05)] transition-colors cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}
