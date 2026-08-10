import { router } from "./init";
import { recipeRouter } from "./routers/recipe";
import { planRouter } from "./routers/plan";
import { groceryRouter } from "./routers/grocery";
import { staplesRouter } from "./routers/staples";
import { userRouter } from "./routers/user";
import { memoryRouter } from "./routers/memory";
import { feedbackRouter } from "./routers/feedback";

export const appRouter = router({
  recipe: recipeRouter,
  plan: planRouter,
  grocery: groceryRouter,
  staples: staplesRouter,
  user: userRouter,
  memory: memoryRouter,
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;
