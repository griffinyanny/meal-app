// A realistic seven-dinner week, ~70 ingredient lines. Ported unchanged from the
// throwaway script that first measured the batch-vs-per-recipe question, so the
// two sets of numbers stay comparable.
//
// It is engineered, not arbitrary: garlic, onion, olive oil, salt and pepper
// recur across recipes so the merge is exercised, and the scallion/green-onion
// synonym appears in three different recipes — the case a single batch call
// could canonicalize by seeing both spellings at once, and a per-recipe call has
// to get from the prompt rule alone.
import type { FixtureRecipe } from "../harness/adapters";

export const WEEK: FixtureRecipe[] = [
  {
    recipeId: "r1",
    recipeTitle: "Sheet-Pan Salmon & Asparagus",
    lines: [
      { qty: "2", unit: "fillets", item: "salmon" },
      { qty: "1", unit: "lb", item: "asparagus" },
      { qty: "2", unit: "tbsp", item: "olive oil" },
      { qty: "3", unit: "cloves", item: "garlic, minced" },
      { qty: "1", unit: "", item: "lemon" },
      { qty: "1", unit: "tsp", item: "salt" },
      { qty: "1/2", unit: "tsp", item: "black pepper" },
      { qty: "2", unit: "stalks", item: "scallions, sliced" },
    ],
  },
  {
    recipeId: "r2",
    recipeTitle: "Chicken Stir-Fry",
    lines: [
      { qty: "1.5", unit: "lbs", item: "chicken thighs" },
      { qty: "3", unit: "tbsp", item: "soy sauce" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "tbsp", item: "fresh ginger, grated" },
      { qty: "1", unit: "", item: "red bell pepper" },
      { qty: "2", unit: "cups", item: "broccoli florets" },
      { qty: "3", unit: "", item: "green onions" },
      { qty: "2", unit: "tbsp", item: "vegetable oil" },
      { qty: "1", unit: "cup", item: "jasmine rice" },
    ],
  },
  {
    recipeId: "r3",
    recipeTitle: "Beef Chili",
    lines: [
      { qty: "1", unit: "lb", item: "ground beef" },
      { qty: "1", unit: "", item: "yellow onion, diced" },
      { qty: "3", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "can", item: "kidney beans" },
      { qty: "1", unit: "can", item: "diced tomatoes" },
      { qty: "2", unit: "tbsp", item: "chili powder" },
      { qty: "1", unit: "tsp", item: "cumin" },
      { qty: "1", unit: "tsp", item: "salt" },
      { qty: "1", unit: "cup", item: "beef broth" },
    ],
  },
  {
    recipeId: "r4",
    recipeTitle: "Margherita Pizza",
    lines: [
      { qty: "1", unit: "ball", item: "pizza dough" },
      { qty: "1/2", unit: "cup", item: "tomato sauce" },
      { qty: "8", unit: "oz", item: "fresh mozzarella" },
      { qty: "1/4", unit: "cup", item: "fresh basil" },
      { qty: "2", unit: "tbsp", item: "olive oil" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1/2", unit: "tsp", item: "salt" },
    ],
  },
  {
    recipeId: "r5",
    recipeTitle: "Lentil Curry",
    lines: [
      { qty: "1", unit: "cup", item: "red lentils" },
      { qty: "1", unit: "", item: "onion, chopped" },
      { qty: "3", unit: "cloves", item: "garlic" },
      { qty: "1", unit: "tbsp", item: "ginger" },
      { qty: "1", unit: "can", item: "coconut milk" },
      { qty: "2", unit: "tbsp", item: "curry powder" },
      { qty: "1", unit: "cup", item: "spinach" },
      { qty: "2", unit: "tbsp", item: "vegetable oil" },
      { qty: "1", unit: "tsp", item: "salt" },
    ],
  },
  {
    recipeId: "r6",
    recipeTitle: "Shrimp Tacos",
    lines: [
      { qty: "1", unit: "lb", item: "shrimp, peeled" },
      { qty: "8", unit: "", item: "corn tortillas" },
      { qty: "1", unit: "", item: "avocado" },
      { qty: "1/4", unit: "cup", item: "cilantro" },
      { qty: "1", unit: "", item: "lime" },
      { qty: "2", unit: "", item: "scallions" },
      { qty: "1", unit: "tsp", item: "cumin" },
      { qty: "1", unit: "tbsp", item: "olive oil" },
    ],
  },
  {
    recipeId: "r7",
    recipeTitle: "Veggie Pasta Primavera",
    lines: [
      { qty: "12", unit: "oz", item: "penne pasta" },
      { qty: "1", unit: "", item: "zucchini" },
      { qty: "1", unit: "cup", item: "cherry tomatoes" },
      { qty: "2", unit: "cloves", item: "garlic" },
      { qty: "1/4", unit: "cup", item: "parmesan" },
      { qty: "3", unit: "tbsp", item: "olive oil" },
      { qty: "1/2", unit: "tsp", item: "black pepper" },
      { qty: "1/4", unit: "cup", item: "fresh basil" },
    ],
  },
];

/**
 * Garlic across the week: 3 + 2 + 3 + 2 + 3 + 2 = 15 cloves, spread over six of
 * the seven recipes. Counted by hand from the lines above, so the eval has a
 * ground truth that does not come from the code it is grading.
 */
export const GARLIC_TOTAL_CLOVES = 15;
