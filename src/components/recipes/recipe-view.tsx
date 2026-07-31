import { Clock, Users, GitBranch } from "lucide-react";
import type { Ingredient, Step } from "@/server/db/schema/recipes";

// The presentational body of a recipe — title/meta (optional), ingredients,
// steps, tags. Extracted from RecipeDetail so it can be reused inline (the Plan
// meal sheet renders it once a slot's recipe hydrates). Purely presentational:
// no data fetching, no mutations, no page chrome (back button, favorite/modify/
// delete live in RecipeDetail).
export interface RecipeViewData {
  title: string;
  description: string | null;
  totalTimeMinutes: number | null;
  servings: number | null;
  parentRecipeId: string | null;
  sourceUrl: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[] | null;
}

export interface RecipeViewProps {
  recipe: RecipeViewData;
  // Show the title + meta + source link. Off when the surrounding surface (e.g.
  // the meal sheet) already presents the title.
  showHeader?: boolean;
}

export function RecipeView({ recipe, showHeader = false }: RecipeViewProps) {
  // BUG-038. A labelled container that renders nothing claims there is a section
  // to read and then says nothing — BUG-009's class ("a null-title slot renders
  // as a permanent Thinking… card") on this surface. So each section is omitted
  // when it has no rows, and when BOTH are missing the screen says so in one
  // line rather than leaving a title floating over ~800px of void.
  //
  // Both empty is REACHABLE IN PRODUCTION, not a seed artifact: an un-hydrated
  // plan draft, or a URL import that failed to parse. The line names the state
  // and invents no cause, because from here the two are indistinguishable.
  const hasIngredients = recipe.ingredients.length > 0;
  const hasSteps = recipe.steps.length > 0;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h1 className="text-xl font-bold tracking-tight">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {recipe.totalTimeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {recipe.totalTimeMinutes} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {recipe.servings} servings
              </span>
            )}
            {/* BUG-046: `Modified` is a status, not a control. It sat in cream
                — the hue §01 reserves for what you press — beside two plain
                muted facts. Dropping the colour lets it inherit the meta row it
                belongs to; the link below is the only cream on this screen and
                is the only thing here you can actually tap. */}
            {recipe.parentRecipeId && (
              <span className="flex items-center gap-1">
                <GitBranch className="size-3" />
                Modified
              </span>
            )}
          </div>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary mt-1 inline-block hover:underline"
            >
              View original source
            </a>
          )}
        </div>
      )}

      {/* Ingredients */}
      {hasIngredients && (
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {/* BUG-046: a list marker is structure, not an affordance. */}
                <span className="shrink-0 size-1.5 rounded-full bg-[var(--spec-text-muted)] mt-1.5" />
                <span>
                  <span className="text-foreground">
                    {ing.qty} {ing.unit}
                  </span>{" "}
                  <span className="text-foreground font-medium">{ing.item}</span>
                  {ing.notes && (
                    <span className="text-muted-foreground"> ({ing.notes})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {hasSteps && (
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Steps
          </h2>
          <ol className="space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.number} className="flex gap-3 text-sm">
                <span className="shrink-0 size-6 rounded-full bg-[rgba(240,222,190,0.05)] flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {step.number}
                </span>
                <div>
                  <p className="text-foreground leading-relaxed">{step.text}</p>
                  {/* BUG-046: the step's duration is a fact about the step,
                      and reads beside a step number already drawn in muted. */}
                  {step.durationMinutes && (
                    <span className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {step.durationMinutes} min
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Neither half exists. One line, no container, no invented cause, and no
          retry — the recipe LOADED fine, so this is an empty state rather than
          an error one and a retry button would be a lie about what went wrong. */}
      {!hasIngredients && !hasSteps && (
        // Centred in the space the two cards used to occupy, rather than left
        // as a caption orphaned under the meta. Same reason `recipes-empty`
        // centres its own message: an empty state has to read as deliberate,
        // and a small line hugging the top of an otherwise black screen reads
        // as a page that failed to load. Flat type, no fill and no border —
        // law 05 reserves a container for something that responds to a tap.
        // py-12 rather than a tall min-height: a 220px centred block read well
        // on its own but pushed the tag row into the middle of an empty screen,
        // stranded from everything. Enough air to be its own object, not enough
        // to orphan what follows it.
        <div className="flex justify-center py-12">
          <p
            data-testid="recipe-body-empty"
            className="text-sm text-muted-foreground"
          >
            No ingredients or steps on this one yet.
          </p>
        </div>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[rgba(240,222,190,0.05)] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
