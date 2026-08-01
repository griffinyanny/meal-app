import { RecipeLibrary } from "@/components/recipes/recipe-library";

export default function RecipesPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="spec-spoken-headline">Recipes</h1>
      <RecipeLibrary />
    </div>
  );
}
