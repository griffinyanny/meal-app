import { RecipeDetail } from "@/components/recipes/recipe-detail";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecipeDetail id={id} />;
}
