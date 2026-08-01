import { RecipeLibrary } from "@/components/recipes/recipe-library";

export default function RecipesPage() {
  return (
    <div className="p-4 space-y-4">
      {/* §05's H1, not the 26px spoken headline it used to wear. That rung is
          the chef talking at screen scale ("use when the sentence IS the
          screen"); a static tab label is not the chef, and it sat there because
          26 was the number the design drew. B8b's chef-voice finding one rung
          up. Griffin's look decides whether 32 stays. */}
      <h1 className="spec-screen-title">Recipes</h1>
      <RecipeLibrary />
    </div>
  );
}
