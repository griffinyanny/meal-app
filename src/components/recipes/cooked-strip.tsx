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
        <p className="spec-meta text-muted-foreground mt-2">Nothing cooked yet.</p>
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
                  // The Meta rung, NOT `.spec-label` — and the difference is
                  // casing, not size. B8b routed this badge off `text-[10px]
                  // font-semibold` by matching size and weight, which is a
                  // reasonable way to pick a rung and is blind to the one
                  // property that actually changed: both caps rungs carry
                  // `text-transform: uppercase`, so a sentence-case date stamp
                  // silently became COOKED JUL 29 while the identical badge in
                  // `recipe-card.tsx` — same string, same green, same pill —
                  // took `.spec-meta` in the same sweep and stayed quiet.
                  //
                  // S57's finding, one component over and one session later:
                  // "which rung does this take" is answered by what the slot
                  // HOLDS, not by what its type measures. `.spec-label` names a
                  // field or a slot; this states a fact about the card, which is
                  // §05's Meta rung in as many words.
                  <span className="self-start spec-meta px-2 py-0.5 rounded-md spec-success-soft text-[var(--spec-success)]">
                    Cooked {cooked}
                  </span>
                )}
                <span className="spec-row-title line-clamp-2">
                  {r.title}
                </span>
                <span className="spec-meta text-muted-foreground">
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
    <h2 className="spec-eyebrow m-0">
      {children}
    </h2>
  );
}
