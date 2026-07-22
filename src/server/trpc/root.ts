import { router } from "./init";
import { recipeRouter } from "./routers/recipe";
import { planRouter } from "./routers/plan";
import { groceryRouter } from "./routers/grocery";
import { staplesRouter } from "./routers/staples";
import { userRouter } from "./routers/user";
import { memoryRouter } from "./routers/memory";

export const appRouter = router({
  recipe: recipeRouter,
  plan: planRouter,
  grocery: groceryRouter,
  staples: staplesRouter,
  user: userRouter,
  memory: memoryRouter,
});

export type AppRouter = typeof appRouter;
