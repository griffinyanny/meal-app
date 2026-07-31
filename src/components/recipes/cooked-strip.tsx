"use client";

import { formatCookedDate, recipeMeta, type RecipeListItem } from "./types";

export type CookedStripProps = {
  recipes: RecipeListItem[];
  onOpen: (id: string) => void;
};

// The "RECENTLY COOKED" shelf — a horizontal strip of what the household has
// actually made (recipes with a harvested lastCookedAt), most recent first.
export function CookedStrip({ recipes, onOpen }: CookedStripProps) {
  return (
    <section aria-label="Recently cooked">
      <Eyebrow>Recently cooked</Eyebrow>
      {recipes.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">Nothing cooked yet.</p>
      ) : (
        <div
          className="mt-2 flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="cooked-strip"
        >
          {recipes.map((r) => {
            const cooked = formatCookedDate(r.lastCookedAt);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpen(r.id)}
                data-testid="cooked-strip-card"
                className="glass-card shrink-0 w-[54%] max-w-[220px] flex flex-col gap-2 p-[14px] text-left cursor-pointer active:scale-[0.99] transition-transform"
              >
                {cooked && (
                  <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-md spec-success-soft text-[var(--spec-success)]">
                    Cooked {cooked}
                  </span>
                )}
                <span className="font-semibold text-sm leading-tight line-clamp-2">
                  {r.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {recipeMeta(r)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-muted-foreground/75 m-0">
      {children}
    </h2>
  );
}
