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
            {recipe.parentRecipeId && (
              <span className="flex items-center gap-1 text-primary">
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
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ingredients
        </h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 size-1.5 rounded-full bg-primary mt-1.5" />
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

      {/* Steps */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Steps
        </h2>
        <ol className="space-y-4">
          {recipe.steps.map((step) => (
            <li key={step.number} className="flex gap-3 text-sm">
              <span className="shrink-0 size-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {step.number}
              </span>
              <div>
                <p className="text-foreground leading-relaxed">{step.text}</p>
                {step.durationMinutes && (
                  <span className="text-xs text-primary mt-1 inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {step.durationMinutes} min
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
