import { router } from "./init";
import { recipeRouter } from "./routers/recipe";
import { planRouter } from "./routers/plan";
import { groceryRouter } from "./routers/grocery";
import { userRouter } from "./routers/user";

export const appRouter = router({
  recipe: recipeRouter,
  plan: planRouter,
  grocery: groceryRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
