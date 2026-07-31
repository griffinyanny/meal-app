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

const nav = (page: Page) => page.getByRole("navigation");

/** Spec §12 item 05's floor: "the glyph is 19px; the target is 44px." */
const MIN_TARGET = 44;

interface Target {
  where: string;
  label: string;
  tag: string;
  width: number;
  height: number;
  exempt: string | null;
}

/**
 * Every icon-only control on the current screen, measured from its real box.
 *
 * "Icon-only" is defined the way the spec defines it — a control whose whole
 * visible content is a glyph — so it is derived from the rendered tree
 * (`innerText` empty, an `<svg>` inside) rather than from a list of class names
 * someone has to remember to update. Same argument as RC11: the property being
 * asserted is a measurement, so measure it.
 */
async function iconOnlyTargets(page: Page, where: string): Promise<Target[]> {
  return page.evaluate((whereLabel) => {
    const SELECTOR = 'button, a[href], [role="button"], summary';
    return Array.from(document.querySelectorAll(SELECTOR))
      .filter((el) => {
        const node = el as HTMLElement;
        if (node.innerText.trim() !== "") return false;
        if (!node.querySelector("svg")) return false;
        const r = node.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => {
        const node = el as HTMLElement;
        const r = node.getBoundingClientRect();
        return {
          where: whereLabel,
          label:
            node.getAttribute("aria-label") ??
            node.getAttribute("data-testid") ??
            node.className.slice(0, 40),
          tag: node.tagName.toLowerCase(),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          exempt: node.getAttribute("data-hit-target-exempt"),
        };
      });
  }, where);
}

const undersized = (targets: Target[]) =>
  targets.filter((t) => t.width < MIN_TARGET || t.height < MIN_TARGET);

const describeTargets = (targets: Target[]) =>
  targets.map((t) => `  ${t.where} · <${t.tag}> "${t.label}" — ${t.width}×${t.height}`).join("\n");

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

  // ⚠️ The exemption is an ALLOW-LIST carried by the ELEMENT, not a rule in this
  // file: `data-hit-target-exempt="<bug id>"` at the call site. One entry today
  // (BUG-048, the constraint chip's 20px remove ×, exempt because 44px inside a
  // 36px chip is a chip redesign rather than a sweep's decision). Anything
  // without the attribute still fails, so a new undersized control cannot hide
  // behind it.
  const exempt = found.filter((t) => t.exempt !== null);
  expect(exempt.length, "the BUG-048 exemption vanished — was the attribute removed?")
    .toBeGreaterThan(0);

  // And the permission cannot outlive its reason: every exempt control must
  // still BE undersized. Fixing the chip without deleting the attribute reds
  // this (S52 — a stale exception is worse than no exception).
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

test.afterAll(async () => {
  await resetTestHousehold();
});
