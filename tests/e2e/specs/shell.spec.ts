// SH — the app shell's chrome (Phase 1F Workstream B, docs/test-plan.md).
// The tab bar is the one surface on every screen, so its geometry is asserted
// once here rather than per-tab. Measured from computed style, never from a
// class name: RC11's precedent — "floating" IS `position: fixed`, and "square"
// IS a zero radius, whatever the utility that produced it is called.
import { test, expect, type Page } from "@playwright/test";
import {
  seedPlanState,
  seedGroceryState,
  seedRecipeState,
  seedYouState,
  resetTestHousehold,
} from "../app/seed";
// Shared with the a11y sweep, which measures the sheets and onboarding this
// tab-level sweep cannot reach. One implementation, three callers.
import {
  MIN_TARGET,
  iconOnlyTargets,
  undersized,
  describeTargets,
  type Target,
} from "../app/hit-targets";

const nav = (page: Page) => page.getByRole("navigation");

test("SH1 - the tab bar's top corners are square, and the hairline still separates it", async ({ page }) => {
  await page.goto("/plan");
  await expect(nav(page)).toBeVisible();

  const chrome = await nav(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      topLeft: s.borderTopLeftRadius,
      topRight: s.borderTopRightRadius,
      borderTopWidth: s.borderTopWidth,
      borderTopStyle: s.borderTopStyle,
    };
  });

  // Spec §07 Fix 1: a full-bleed bar pinned to the bottom of the device is
  // system chrome, and rounding its top makes it read as a sheet that got stuck
  // halfway up.
  expect(chrome.topLeft).toBe("0px");
  expect(chrome.topRight).toBe("0px");

  // Asserted in BOTH directions on purpose (RC14's rule): the spec's fix is
  // "square it and let the hairline top border do the separating", so a build
  // that squared the corners by dropping `.spec-chrome` altogether would satisfy
  // the radius half while deleting the thing that replaces it.
  expect(chrome.borderTopStyle).toBe("solid");
  expect(parseFloat(chrome.borderTopWidth)).toBeGreaterThan(0);
});

// SH2 · spec §12 item 05. The spec names ONE offender (the recipe-card heart,
// "a bare 19px SVG with no padded target — that is a real tap failure, not a
// style nit") and then generalises: "the same applies to every icon-only
// control." So this sweeps rather than checking the heart, because the named
// example is an example.
test("SH2 - every icon-only control is at least 44x44 on every tab", async ({ page }) => {
  const found: Target[] = [];

  // Rich states on purpose: an empty tab renders none of the controls this is
  // looking for, so a sweep over first-run screens would pass by finding
  // nothing. Each seed is the one that puts the most controls on the screen.
  await seedPlanState("CONFIRMED");
  await page.goto("/plan");
  await expect(nav(page)).toBeVisible();
  found.push(...(await iconOnlyTargets(page, "plan")));

  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");
  await expect(page.getByTestId("library-list")).toBeVisible();
  found.push(...(await iconOnlyTargets(page, "recipes")));

  // The recipe DETAIL, which is a dialog on top of the tab just swept. The tab
  // sweep cannot see it, and three of the app's icon buttons live only here —
  // the source-side check is what found them, not this sweep. Opening it is how
  // the sweep stops being blind (S53's rule: ask what the layer cannot see).
  await page.getByTestId("recipe-card").filter({ hasText: "Miso-Glazed Salmon" }).click();
  await expect(page.getByTestId("add-to-week")).toBeVisible();
  found.push(...(await iconOnlyTargets(page, "recipe-detail")));

  // ⚠️ These two legs waited on `nav` when this sweep was written (S54), and
  // `nav` is the tab bar — it renders instantly on every route, including while
  // the tab's own tRPC query is still in flight. Both tabs render a loading body
  // until their data lands, so the sweep was measuring a SKELETON on two of its
  // five legs and reporting a clean app. The Plan and Recipes legs above always
  // waited on real content, which is why they were the ones finding things.
  //
  // S54's finding, a second time, in the same file: "the sweep written to BE the
  // audit was blind to two thirds of its own subject." Writing the instrument
  // does not exempt it from the question — and neither does fixing it once.
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(page.getByTestId("grocery-list")).toBeVisible();
  found.push(...(await iconOnlyTargets(page, "groceries")));

  await seedYouState("YOU_RETURNING");
  await page.goto("/you");
  await expect(page.getByTestId("you-safety-card")).toBeVisible();
  found.push(...(await iconOnlyTargets(page, "you")));

  // The sweep finding nothing at all would mean the selector broke, not that
  // the app is clean — the apparatus has to be able to fail.
  expect(found.length, "the sweep found no icon-only controls at all").toBeGreaterThan(0);

  // ⚠️ The allow-list is EMPTY as of 1F/B8a, and it is empty rather than
  // deleted. BUG-048 (the constraint chip's 20px remove ×) was its one entry;
  // closing the bug reddened this file until the attribute went with it, which
  // is exactly what listing it here was for (S52 — a fixed bug cannot leave a
  // stale permission behind).
  //
  // Granting a new exemption is deliberately a TWO-place change now: the
  // `data-hit-target-exempt="<bug id>"` attribute at the call site, and this
  // expectation. An attribute alone reds the suite, so an exemption cannot be
  // added quietly by the person who wants one.
  const exempt = found.filter((t) => t.exempt !== null);
  expect(
    exempt,
    `hit-target exemptions are granted in this file too — if one is genuinely ` +
      `owed, name the bug here:\n${describeTargets(exempt)}`
  ).toEqual([]);

  // And whenever the list is non-empty again, the permission still cannot
  // outlive its reason: an exempt control that MEETS the floor is a fixed bug
  // wearing a stale exception, and reds this.
  const exemptButFine = exempt.filter((t) => !undersized([t]).length);
  expect(
    exemptButFine,
    `these carry a hit-target exemption but now MEET the floor — delete the ` +
      `attribute and close the bug:\n${describeTargets(exemptButFine)}`
  ).toEqual([]);

  const violations = undersized(found).filter((t) => t.exempt === null);
  expect(
    violations,
    `icon-only controls under ${MIN_TARGET}px:\n${describeTargets(violations)}`
  ).toEqual([]);
});

// SH3 · spec §12 item 07. The item is about type levels, but the spec names
// them "Group title · H4" and "Row title · H5" — so the element is half the
// ask, and a subsection headed by a <p> is the faked heading in its purest
// form. Asserted by ROLE, not by text: `getByText` passed happily against the
// paragraphs these used to be, so only the role can fail on a regression.
//
// Deliberately NOT asserted: the two eyebrows sitting directly above an <h1>
// (Groceries' "Groceries · This week", You's "Your chef"). Those are kickers in
// a title block, and promoting them would put an h2 BEFORE the h1 — worse than
// leaving them, which is why the sweep of "every uppercase label" was wrong.
test("SH3 - subsection labels are real headings, not paragraphs", async ({ page }) => {
  const heading = (name: string) => page.getByRole("heading", { name });

  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");
  await expect(heading("Produce")).toBeVisible();
  // The screen title stays the h1 above them.
  await expect(page.getByRole("heading", { name: "Your list", level: 1 })).toBeVisible();

  await seedYouState("YOU_RETURNING");
  await page.goto("/you");
  await expect(heading("What I cook around")).toBeVisible();
  await expect(heading("What I've picked up")).toBeVisible();
  await expect(heading("Account")).toBeVisible();

  await seedRecipeState("RECIPES_LIBRARY");
  await page.goto("/recipes");
  await expect(heading("Recently cooked")).toBeVisible();
});

// SH4 · spec §08's law 06: "One filled cream button per viewport. If two
// actions both feel primary, one of them is not."
//
// ⚠️ THIS RULE HAS BROKEN IN THREE CONSECUTIVE SESSIONS, and every time it was
// caught by eye on a surface the visual gate had already cleared:
//   S55 — the Recipes filter chip was `bg-primary`, a filled cream button
//         standing in for a filter STATE, beside the library's `+`.
//   S56 — the Groceries organize toggle painted its selected segment the same
//         way, and B7 was about to put a filled cream send directly beneath it.
//   S57 — the Plan intent screen carried the §09 send AND a full-width
//         "Build my first week", on the front door of the north-star flow.
//
// `visual-qa-rubric.md` has carried this exact sentence since S42 and the judge
// cleared all three anyway. S55's own conclusion was that the check "was not
// missing, not stale, not seed-blinded — it was present, correct, and UNRUN."
// A rule a judge has to remember is not a rule; this measures it instead.
//
// Measured from computed style, never from a class name (RC11's precedent):
// "filled cream" IS the action fill at full alpha, whatever utility produced it.
// The tinted rungs (`action.soft`, `bg-primary/10`, a selected chip) are the
// spec's answer for everything that is not the primary, so they are what the
// count is meant to leave alone.
async function filledCreamCount(page: Page, where: string) {
  return page.evaluate((whereLabel) => {
    // --spec-action, #F4EBDC.
    const [AR, AG, AB] = [244, 235, 220];
    const hits: { where: string; label: string; tag: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;
      const m = s.backgroundColor.match(
        /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
      );
      if (!m) continue;
      const [red, green, blue] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const alpha = m[4] === undefined ? 1 : Number(m[4]);
      // Full-alpha only: a tint is a different rung, not a quieter primary.
      if (alpha < 0.9) continue;
      if (
        Math.abs(red - AR) > 3 ||
        Math.abs(green - AG) > 3 ||
        Math.abs(blue - AB) > 3
      )
        continue;
      hits.push({
        where: whereLabel,
        label:
          el.getAttribute("aria-label") ??
          el.getAttribute("data-testid") ??
          el.innerText.trim().slice(0, 40) ??
          el.tagName,
        tag: el.tagName.toLowerCase(),
      });
    }
    return hits;
  }, where);
}

test("SH4 - no viewport carries more than one filled cream button", async ({ page }) => {
  const surfaces: { where: string; go: () => Promise<void> }[] = [
    {
      where: "plan-review",
      go: async () => {
        await seedPlanState("DRAFT");
        await page.goto("/plan");
        await expect(page.getByTestId("plan-rail")).toBeVisible();
      },
    },
    {
      where: "groceries",
      go: async () => {
        await seedGroceryState("GROCERY_READY");
        await page.goto("/groceries");
        await expect(page.getByTestId("grocery-list")).toBeVisible();
      },
    },
    {
      where: "recipes-library",
      go: async () => {
        await seedRecipeState("RECIPES_LIBRARY");
        await page.goto("/recipes");
        await expect(page.getByTestId("recipe-card").first()).toBeVisible();
      },
    },
    {
      where: "you",
      go: async () => {
        await seedYouState("YOU_RETURNING");
        await page.goto("/you");
        await expect(page.getByTestId("you-safety-card")).toBeVisible();
      },
    },
    {
      // ⚠️ The SEEDED variant specifically, because that is the one that broke.
      // The unseeded intent screen pairs the §09 send with a text link and was
      // always within budget; the onboarding hand-off swaps that link for a
      // full-width commit, and only then are there two. Sweeping the easy state
      // and calling the surface covered is the mistake SH2 made.
      //
      // Reached by planting the hand-off rather than by walking the interview:
      // it is read-once sessionStorage (`takeHandoff` clears it), so planting it
      // is the same door OB4 arrives through, without a second copy of the
      // onboarding walk that would rot the moment the flow changes.
      //
      // ⚠️ `addInitScript`, NOT `goto` → `evaluate` → `reload`. The first
      // version did the latter and lost the hand-off on one run in two: the key
      // has to exist before the app's first paint, because `takeHandoff` runs in
      // a mount effect and a plant that lands after it reads is a plant that
      // never happened. `addInitScript` runs before any page script on every
      // navigation, so the ordering is guaranteed by construction rather than by
      // a wait that happened to be long enough. This leg runs LAST for the same
      // reason: the init script re-plants on every later navigation, and the
      // only surface that would read it is this one.
      where: "plan-intent (seeded — the north-star front door)",
      go: async () => {
        await seedPlanState("EMPTY");
        await page.addInitScript(() =>
          window.sessionStorage.setItem(
            "meal-app:onboarding-handoff",
            JSON.stringify({ request: "leaning Thai, featuring fish" })
          )
        );
        await page.goto("/plan");
        // The seeded EYEBROW, not a button and not the chips: it renders on
        // `seed` alone, where the chips additionally need persisted preferences
        // this seed state does not carry. Waiting on something that depends on
        // more than the branch under test is how SH2 ended up measuring a
        // skeleton. (`plan-build-first-week` was the wait until S57 deleted it
        // — see no-plan-state.tsx.)
        await expect(
          page.getByText("YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME")
        ).toBeVisible();
      },
    },
  ];

  // ⚠️ Each leg waits on that surface's REAL CONTENT, never on `nav`. SH2 shipped
  // waiting on the tab bar for two of its five legs, and the tab bar renders
  // instantly on every route — so it measured a loading skeleton and reported a
  // clean app for two whole sessions (S56). A sweep is only as honest as the
  // thing it waits for.
  const over: string[] = [];
  let totalFound = 0;
  for (const s of surfaces) {
    await s.go();
    const hits = await filledCreamCount(page, s.where);
    totalFound += hits.length;
    if (hits.length > 1) {
      over.push(
        `  ${s.where} — ${hits.length} filled cream:\n` +
          hits.map((h) => `      <${h.tag}> "${h.label}"`).join("\n")
      );
    }
  }

  // ⚠️ Law 06 is a CEILING, not a floor (B6's reading — a browse screen whose
  // primary action lives on the NEXT screen should not manufacture one), so
  // zero on a given surface is correct. Zero across ALL of them is not: it would
  // mean the colour match broke and this sweep had quietly become a no-op
  // reporting a clean app forever. That is SH2's exact failure mode, which is
  // why this assertion is here rather than looking obviously unnecessary.
  expect(
    totalFound,
    "the sweep found no filled cream anywhere — that is a broken colour match, " +
      "not a clean app"
  ).toBeGreaterThan(0);

  expect(
    over.join("\n"),
    `§08: one filled cream button per viewport. Over budget:\n${over.join("\n")}`
  ).toBe("");
});

// SH5 · a type rung must never eat the colour written beside it.
//
// ⚠️ THIS EXISTS BECAUSE IT HAPPENED. B8a named the two caps rungs as classes
// that set `color`, and put them in `@layer utilities` — where hand-authored
// CSS is emitted AFTER Tailwind's generated colour utilities, so within the one
// layer source order silently won. Eight call-site overrides died at once: five
// gold eyebrows the gold line requires, and three SAFETY-weighted red labels.
//
// It cleared the capture gate. `--spec-text-muted` is a warm tan, and at 11px
// on a near-black floor a warm tan reads as "probably gold" — the screenshot
// looked correct and only the built CSS proved otherwise. So this asserts the
// COMPUTED colour on the two that matter most: the eyebrow §01 names by name
// ("gold.tint — Orb highlight, YOUR CHEF eyebrow"), and a safety label, where
// losing the red is the one that actually costs something.
test("SH5 - a type rung does not override the colour written beside it", async ({ page }) => {
  const colourOf = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);

  await seedPlanState("DRAFT");
  await page.goto("/plan");
  await expect(page.getByTestId("plan-rail")).toBeVisible();
  // #F0C265 — gold.tint. The chef's eyebrow, carrying `.spec-eyebrow` for its
  // size/weight/tracking and the gold for its meaning.
  expect(await colourOf('text=YOUR CHEF')).toBe("rgb(240, 194, 101)");

  await seedYouState("YOU_RETURNING");
  await page.goto("/you");
  await expect(page.getByTestId("you-safety-card")).toBeVisible();
  // rgba(227,155,146,.75) on the safety card's weight label. Muted tan here
  // would mean the rung ate it — which is exactly what shipped for one round.
  expect(await colourOf('text=SAFETY-CRITICAL')).toBe("rgba(227, 155, 146, 0.75)");
});

test.afterAll(async () => {
  await resetTestHousehold();
});
