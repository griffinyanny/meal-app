// Barrel for the E2E AI mock's fixtures. The real content lives per-domain in
// ./e2e-fixtures/ — this file exists so the mock model and the Playwright specs
// keep a single import path while each domain stays independently readable.
//
// This whole tree is only reached when E2E_AI_MOCK is on (see e2e-mock.ts). It
// carries no secrets and never runs in production.
//
// The mock is the single seam the entire E2E suite rides on, so drift here is
// silent by nature: a fixture that stops resembling the real model's output
// makes the suite green against a lie. That is what the Layer-B (real-model)
// capture cadence in docs/test-plan.md exists to catch — the mock cannot catch
// it for us, and one domain's fixture going stale should not be able to hide
// behind another's. Hence the split.
export {
  parseMockDirectives,
  extractBlock,
  type MockDirectives,
} from "./e2e-fixtures/shared";

export {
  FRESH_TITLE_PREFIX,
  REWORKED_TITLE_PREFIX,
  GENERATION_CHEF_SUMMARY,
  WHOLE_WEEK_CHEF_RESPONSE,
  SCOPED_CHEF_RESPONSE,
  EATING_OUT_CHEF_RESPONSE,
  buildGenerationFixture,
  buildModificationFixture,
} from "./e2e-fixtures/plan";

export {
  HYDRATED_RECIPE_STEP,
  buildRecipeFixture,
  buildRecipeModifyFixture,
} from "./e2e-fixtures/recipe";

export { buildNormalizeFixture } from "./e2e-fixtures/normalize";

export {
  GROCERY_TALK_TACO_ADDS,
  GROCERY_TALK_QUERY_REPLY,
  buildGroceryTalkFixture,
} from "./e2e-fixtures/grocery-talk";

export { buildPreferencesTalkFixture } from "./e2e-fixtures/preferences-talk";
