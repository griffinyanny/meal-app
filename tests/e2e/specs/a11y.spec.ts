// A — the accessibility sweep (Phase 1F Workstream D, docs/test-plan.md).
//
// WHY THIS EXISTS, AND WHY NOW. BUG-060 rewrote how six components are NAMED:
// `aria-label={`Check off ${item.name}`}` put the grocery list, the week's meal
// titles, the recipe library and the user's dietary constraints into session
// replay in the clear, because rrweb records attributes verbatim and the
// installed build exposes no attribute hook. The fix moved every accessible
// name onto TEXT NODES — the element's own contents, or `aria-labelledby` at
// the node that already renders the name, with icon-only verbs in `sr-only`
// spans. That is the right fix and WCAG 2.5.3 prefers it.
//
// ⚠️ But it means six controls stopped being named by a string a human wrote
// and started being named by whatever the browser COMPUTES from the rendered
// tree. Those are different things, and the failure mode of the second is a
// control that silently ends up with NO name at all — invisible to every test
// in this repo, and invisible to a source read, because the accessible name is
// not in the source. `aria-leak.test.ts` scans `src/` and can only prove a
// dynamic `aria-label` is ABSENT; it cannot prove a name is PRESENT.
//
// So this sweep measures the rendered accessibility tree in a real browser,
// which is the only place the answer exists.
//
// ⚠️ ONE TEST PER SURFACE, DELIBERATELY. Playwright gives each test a fresh
// browser context, and therefore a fresh IndexedDB. A single test walking every
// surface would carry the persisted React Query cache between legs, and with
// `staleTime: 30_000` a later leg would render an earlier leg's data while the
// test name claimed otherwise — which is BUG-053 exactly, and it made the
// Groceries capture silently ungradeable for two sessions. Fixed here by
// construction rather than by a cleanup step that can be forgotten.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  seedPlanState,
  seedGroceryState,
  seedRecipeState,
  seedYouState,
  seedOnboardingState,
  resetTestHousehold,
} from "../app/seed";
import { openMealSheet, sheetContent, planRail } from "../app/selectors";

// ⚠️ EVERY TEST STARTS ONBOARDED, AND THIS IS NOT DECORATION.
//
// Two of the surfaces below seed `ONBOARDING_NEW`, which is a household that
// has not completed the interview — and `OnboardGuard` redirects such a
// household to `/welcome` from ANY tab route. Without this line the two
// onboarding surfaces silently poison every test declared after them: the app
// bounces to `/welcome`, the tab's testid never appears, and the failure reads
// `element(s) not found` rather than `you were redirected`. It cost three
// failures on this file's second run, all of them pointing at the wrong thing.
//
// Seeded per-test rather than fixed by re-ordering the array, because an order
// dependency that happens to work is a trap for whoever adds surface number ten.
test.beforeEach(async () => {
  await seedOnboardingState("ONBOARDING_DONE");
});

test.afterAll(async () => {
  await resetTestHousehold();
});

/**
 * The rules that are GATED — a violation of any of these fails the suite.
 *
 * Every one is a defect with no taste component: a control nobody can name, an
 * ARIA attribute pointing at nothing, two elements claiming the same id, an
 * interactive element buried inside another. None of them is arguable against
 * the design spec, which is the test for whether a rule belongs on this list.
 *
 * ⚠️ Rules NOT on this list are not ignored — see `OTHER_CEILING` below. A
 * curated gate plus a silent remainder is how a sweep reports a clean app while
 * looking at a third of it (S54), so the remainder is ratcheted rather than
 * dropped.
 */
const GATED_RULES = [
  // ── Names. This is the BUG-060 surface, and the reason the file exists.
  "button-name",
  "link-name",
  "input-button-name",
  "select-name",
  "aria-command-name",
  "aria-toggle-field-name",
  "aria-input-field-name",
  "image-alt",
  "input-image-alt",
  "role-img-alt",
  "label",
  // ── ARIA correctness. `aria-labelledby` pointing at a removed node names
  // nothing, and that is precisely the shape the BUG-060 fix introduced:
  // `grocery-row` carries `nameId` on a wrapper because the title button is
  // swapped for a text field while editing. That reasoning is right; this is
  // what proves it stayed right.
  "aria-valid-attr",
  "aria-valid-attr-value",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-allowed-attr",
  "aria-allowed-role",
  "aria-hidden-focus",
  "aria-hidden-body",
  "duplicate-id-aria",
  "nested-interactive",
];

interface Surface {
  name: string;
  /**
   * Measured ceiling for NON-gated axe violations on this surface. Derived by
   * running the sweep and reading the count — never guessed, and never copied
   * from a doc. S59: a ratchet set above its own subject is not a ratchet, and
   * `type-scale.test.ts` shipped with forty-five notches of slack that way.
   */
  otherCeiling: number;
  prepare: (page: Page) => Promise<void>;
  /**
   * ⚠️ THE SURFACE'S OWN CONTENT, RE-ASSERTED AT SCAN TIME.
   *
   * `prepare()` proves the screen rendered ONCE. It does not prove the screen
   * is still there when axe runs, and those are different claims: the first
   * measurement run of this sweep caught the Plan body present at the
   * `prepare()` wait and GONE milliseconds later — main collapsed to a
   * greeting and a tab bar, 96 elements where a rendered intent screen has
   * 121. axe scanned that and reported one violation, which would have been
   * recorded as "plan-intent is nearly clean" when the truth was "there was
   * nothing on the page to grade."
   *
   * That is S56's SH2 finding in a new costume — a sweep measuring a skeleton
   * and reporting a clean app — and the reason it is a SEPARATE field rather
   * than a longer wait in `prepare()` is that the two assertions answer
   * different questions. A wait cannot prove a later absence did not happen.
   */
  anchor: (page: Page) => ReturnType<Page["getByTestId"]>;
}

const SURFACES: Surface[] = [
  {
    // The north-star flow's FRONT DOOR, and the surface BUG-058 broke. If one
    // screen in this app has to be right, it is this one.
    name: "plan-intent",
    anchor: (page) => page.getByRole("heading", { name: "What are you thinking this week?" }),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedPlanState("EMPTY");
      await page.goto("/plan");
      await expect(
        page.getByRole("heading", { name: "What are you thinking this week?" })
      ).toBeVisible();
    },
  },
  {
    name: "plan-confirmed",
    anchor: (page) => planRail(page),
    // 1 = `page-has-heading-one`. MEASURED, and it is a real finding rather
    // than noise: BUG-028 made `ChefHeader`'s summary an `<h2>` after the hero
    // was deleted, so this tab's top heading is an h2 and the document has no
    // level-one heading at all. Filed as BUG-063 — which element should be the
    // h1 is a document-outline decision with a design half, so it is Griffin's
    // call rather than a silent restructure by the sweep that found it.
    otherCeiling: 1,
    prepare: async (page) => {
      await seedPlanState("CONFIRMED");
      await page.goto("/plan");
      await expect(planRail(page)).toBeVisible();
    },
  },
  {
    // ⚠️ A SHEET, which `SH2` has never opened. S54's finding was that the
    // 44px sweep found 2 violations on the tabs while 4 more sat inside a
    // dialog it never opened — "ask what the layer cannot see", and the answer
    // was a whole class of surface. The sheets are where the icon-only controls
    // and the freeform fields live.
    name: "plan-meal-sheet",
    anchor: (page) => sheetContent(page),
    otherCeiling: 0,
    prepare: async (page) => {
      const plan = await seedPlanState("DRAFT");
      await page.goto("/plan");
      await expect(planRail(page)).toBeVisible();
      await openMealSheet(page, plan.slots[1].date);
      await expect(sheetContent(page)).toBeVisible();
    },
  },
  {
    name: "recipes-library",
    anchor: (page) => page.getByTestId("library-list"),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedRecipeState("RECIPES_LIBRARY");
      await page.goto("/recipes");
      await expect(page.getByTestId("library-list")).toBeVisible();
    },
  },
  {
    name: "recipe-detail",
    anchor: (page) => page.getByTestId("add-to-week"),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedRecipeState("RECIPES_LIBRARY");
      await page.goto("/recipes");
      await expect(page.getByTestId("library-list")).toBeVisible();
      await page.getByTestId("recipe-card").first().click();
      await expect(page.getByTestId("add-to-week")).toBeVisible();
    },
  },
  {
    // The surface used MOST, and the one whose content BUG-060 was leaking.
    name: "groceries",
    anchor: (page) => page.getByTestId("grocery-list"),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedGroceryState("GROCERY_READY");
      await page.goto("/groceries");
      await expect(page.getByTestId("grocery-list")).toBeVisible();
    },
  },
  {
    name: "you",
    // ⚠️ ANCHORED ON THE HEADING, not on `you-safety-card`, and the difference
    // was three runs of intermittent noise. The safety card and the chef
    // narrative are separate cards on separate queries, so the safety card can
    // be on screen while the `<h1>` in `chef-narrative-card` has not landed —
    // and `page-has-heading-one` then fires against a page that simply had not
    // finished. THE ANCHOR MUST BE THE ELEMENT WHOSE ABSENCE WOULD CHANGE THE
    // FINDING, not merely some content proving the route rendered.
    anchor: (page) => page.getByRole("heading", { name: "Here's what I know about you." }),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedYouState("YOU_RETURNING");
      await page.goto("/you");
      await expect(page.getByTestId("you-safety-card")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Here's what I know about you." })
      ).toBeVisible();
    },
  },
  {
    // Onboarding is the one surface `SH2` has never visited at all, and it is
    // the first thing a new account sees.
    name: "onboarding-welcome",
    anchor: (page) => page.getByTestId("onboarding-start"),
    otherCeiling: 0,
    prepare: async (page) => {
      await seedOnboardingState("ONBOARDING_NEW");
      await page.goto("/welcome");
      await expect(page.getByTestId("onboarding-start")).toBeVisible();
    },
  },
  {
    name: "onboarding-interview",
    anchor: (page) => page.getByTestId("onboarding-tell-me-input"),
    // 1 = `page-has-heading-one`, same finding as plan-confirmed. See BUG-063.
    otherCeiling: 1,
    prepare: async (page) => {
      await seedOnboardingState("ONBOARDING_NEW");
      await page.goto("/welcome");
      await page.getByTestId("onboarding-start").click();
      await expect(page.getByTestId("onboarding-tell-me-input")).toBeVisible();
    },
  },
];

interface AxeNode {
  html: string;
  target: unknown[];
}
interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: AxeNode[];
}

const describe = (violations: AxeViolation[]) =>
  violations
    .flatMap((v) =>
      v.nodes.map(
        (n) => `  [${v.id}] ${v.help}\n      ${n.html.replace(/\s+/g, " ").slice(0, 160)}`
      )
    )
    .join("\n");

for (const surface of SURFACES) {
  test(`A1 · ${surface.name} — no gated accessibility violations`, async ({ page }) => {
    await surface.prepare(page);

    // ⚠️ The screen is still there — asserted immediately BEFORE the scan, not
    // only in `prepare()`. See the `anchor` doc comment: the first measurement
    // run caught the Plan body vanishing between the two, and axe then graded
    // an empty page as nearly clean.
    await expect(
      surface.anchor(page),
      `${surface.name} lost its own content between prepare() and the scan — ` +
        `axe would have graded a skeleton and reported a clean surface`
    ).toBeVisible();

    // ⚠️ `color-contrast` is disabled here and carried by `A3` instead. It is
    // the one axe rule that argues with a LOCKED design decision — §01's warm
    // near-black palette — so gating on it would mean this file silently
    // overruling the design spec. That is Griffin's call, not the suite's.
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    // And still there AFTER, because the scan itself takes time and a screen
    // that collapsed halfway through was only half graded. Asserting one side
    // of a window does not close it.
    await expect(
      surface.anchor(page),
      `${surface.name} lost its own content DURING the axe scan, so the result ` +
        `describes a page that was partly gone`
    ).toBeVisible();

    const violations = results.violations as unknown as AxeViolation[];
    const gated = violations.filter((v) => GATED_RULES.includes(v.id));
    const other = violations.filter((v) => !GATED_RULES.includes(v.id));

    // The apparatus has to be able to fail. axe returning nothing at all — a
    // broken injection, a page that never rendered — passes every assertion
    // below vacuously, which is the test-that-cannot-fail this project has now
    // produced five distinct ways. `passes` is the tell: a real scan of a real
    // screen always satisfies dozens of rules.
    expect(
      results.passes.length,
      `axe reported no PASSING rules on ${surface.name} — the scan did not run ` +
        `against a rendered page, so every assertion below is vacuous`
    ).toBeGreaterThan(5);

    expect(
      gated,
      `gated accessibility violations on ${surface.name}:\n${describe(gated)}`
    ).toEqual([]);

    // Everything axe found that is NOT on the gate. Ratcheted rather than
    // ignored, so a NEW category of violation cannot arrive unseen just because
    // nobody thought to add its rule id to the list above.
    const otherCount = other.reduce((n, v) => n + v.nodes.length, 0);
    expect(
      otherCount,
      `non-gated axe violations on ${surface.name} rose above its measured ` +
        `ceiling of ${surface.otherCeiling}. These are not auto-fail, but the ` +
        `count only goes DOWN:\n${describe(other)}`
    ).toBeLessThanOrEqual(surface.otherCeiling);
  });
}

/**
 * The accessible names inside a container, read from the real accessibility
 * tree rather than from the DOM.
 *
 * `ariaSnapshot()` runs Playwright's own accessible-name computation, which is
 * the same algorithm a screen reader uses — so this measures what a person
 * would actually hear, not what the markup suggests they would.
 */
async function namesIn(page: Page, testId: string, role: string): Promise<string[]> {
  const snapshot = await page.getByTestId(testId).ariaSnapshot();
  const names: string[] = [];
  for (const line of snapshot.split("\n")) {
    const m = line.match(new RegExp(`- ${role}(?: "([^"]*)")?`));
    if (m) names.push(m[1] ?? "");
  }
  return names;
}

// A2 · THE REGRESSION BUG-060's FIX COULD HAVE CAUSED, AND THE ONE axe CANNOT SEE.
//
// axe asks "does this control have a name?" — one control at a time. It has no
// opinion about a list of twelve controls that all answer "Uncheck". That is
// not a WCAG violation, and it is exactly what removing an interpolated label
// produces when the item name does not make it into the computed name: every
// row announces identically and a screen-reader user cannot tell them apart.
//
// The old `aria-label={`Check off ${item.name}`}` guaranteed distinctness by
// construction. The text-node fix has to EARN it, so it gets asserted.
test("A2 - grocery rows are individually distinguishable by name", async ({ page }) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(page.getByTestId("grocery-list")).toBeVisible();

  const names = await namesIn(page, "grocery-list", "checkbox");

  expect(names.length, "found no grocery checkboxes at all").toBeGreaterThan(1);
  expect(
    names.filter((n) => n.trim() === ""),
    `grocery checkboxes with an EMPTY accessible name — nothing announces ` +
      `them:\n${JSON.stringify(names, null, 2)}`
  ).toEqual([]);
  expect(
    new Set(names).size,
    `grocery checkboxes share accessible names, so the rows are ` +
      `indistinguishable to a screen reader:\n${JSON.stringify(names, null, 2)}`
  ).toBe(names.length);
});

test("A2b - recipe cards are individually distinguishable by name", async ({ page }) => {
  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");
  await expect(page.getByTestId("library-list")).toBeVisible();

  const names = await namesIn(page, "library-list", "button");
  const named = names.filter((n) => n.trim() !== "");

  expect(named.length, "found no named recipe controls at all").toBeGreaterThan(1);
  expect(
    names.filter((n) => n.trim() === "").length,
    `recipe library buttons with an EMPTY accessible name:\n${JSON.stringify(names, null, 2)}`
  ).toBe(0);
});

/**
 * Measured, not guessed. Set from a real run of the sweep — see the session
 * notes for what it counts and Griffin's call on each.
 */
const CONTRAST_BASELINE = 0;

// A3 · COLOUR CONTRAST — measured and ratcheted, never gated.
//
// ⚠️ This rule argues with a locked design decision. §01's palette is a warm
// near-black floor with muted warm-tan type, ratified by Griffin in S42 and
// swept app-wide in 1E.7; axe grades against WCAG AA, which does not know the
// spec exists. Failing the suite on it would mean this file quietly overruling
// the design system, and "the check that overruled the spec" is a worse outcome
// than a documented number.
//
// So it is a RATCHET carrying the measured count, and the findings go to
// Griffin as a decision rather than to the build as a failure. It cannot get
// worse without going red, which is the property that actually matters.
test("A3 - colour contrast does not get worse than its measured baseline", async ({
  page,
}) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(page.getByTestId("grocery-list")).toBeVisible();

  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  const nodes = results.violations.reduce((n, v) => n + v.nodes.length, 0);
  const undetermined = results.incomplete.reduce((n, v) => n + v.nodes.length, 0);

  // ⚠️ `incomplete` IS THE ANSWER ON THIS APP, AND COUNTING ONLY `violations`
  // WOULD HAVE REPORTED A CLEAN SCREEN.
  //
  // axe files a contrast result as `incomplete` when it cannot resolve what is
  // BEHIND the text — a gradient, a background image, or a translucent layer
  // over another layer. §01's surfaces are exactly that: warm near-black floors
  // under `.glass-card` / `.glass-surface` fills at `.94` alpha. So the rule
  // runs, decides it cannot be sure, and returns zero violations and zero
  // passes. A test reading `violations.length === 0` would call that a pass.
  //
  // This is the same shape as S64's masking check reporting clean against a
  // gzipped body: an empty result and a good result look identical unless you
  // prove the measurement produced something. Hence the guard below counts all
  // three buckets, and `undetermined` is reported rather than swallowed —
  // "axe could not tell" is a finding for a human, not a silence.
  const evaluated = results.passes.length + results.violations.length + undetermined;
  expect(
    evaluated,
    "the contrast scan evaluated nothing at all — not one node passed, failed " +
      "or came back undetermined, which means it did not run against a " +
      "rendered page rather than that the page is clean"
  ).toBeGreaterThan(0);

  console.log(
    `[A3] contrast on groceries — ${nodes} definite violation(s), ` +
      `${undetermined} undetermined (translucent/gradient background), ` +
      `${results.passes.length} passing`
  );

  expect(
    nodes,
    `contrast violations on Groceries rose above the measured baseline. This ` +
      `is a DESIGN decision, not an automatic defect — but it only goes down.`
  ).toBeLessThanOrEqual(CONTRAST_BASELINE);
});
