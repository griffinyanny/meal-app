// App-specific (meal-app): the Groceries-tab capture states + ground-truth facts.
// Groceries publishes no debug-HUD section (only Plan does), so these states are
// gated on readyText + facts rather than a HUD derivedState — the capture runtime
// handles a missing HUD gracefully (captureStatus stays "ok"). Copy strings are
// verified against the components. Some states drive a small interaction in
// navigate() (toggle mode, check an item, open the chef sheet) and wait for the
// resulting element before the shot.
import { type Page } from "@playwright/test";
import { seedGroceryState } from "../app/seed";
import { type CaptureStateDef } from "../harness/capture-runtime";

// No HUD section on this tab; a nominal key for the manifest meta.
export const GROCERY_SECTION_KEY = "grocery";

const gotoGroceries = (page: Page) => page.goto("/groceries").then(() => {});

// Go to a ready list AND wait for the staples chip row to resolve — it's a
// separate async query (staples.list) that lands after the list itself, so
// gating only on the header can shoot before the chips render.
async function gotoReady(page: Page): Promise<void> {
  await page.goto("/groceries");
  await page.getByText("Your list", { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.getByTestId("staples-row").waitFor({ timeout: 8_000 }).catch(() => {});
}

export const GROCERY_CAPTURE_STATES: CaptureStateDef[] = [
  {
    id: "grocery-ready-grouped",
    briefRef: "groceries/imported.dc.html — grouped shoppable list",
    readyText: "Your list",
    facts: {
      header: "Your list",
      hasProgressBar: true,
      organizeToggle:
        "segmented, spec §11: the selected segment LIFTS (raised warm surface, no colour) — Grouped / Ungrouped",
      aisleSections: true,
      mergeMarkerOnMultiSourceItem: "garlic → neutral inset chip reading '2 dinners' (NOT an amber dot)",
      hasStaplesRow: true,
      hasTopAddRow: true,
      hasBottomAddRow: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: gotoReady,
  },
  {
    id: "grocery-generating",
    briefRef: "groceries — generating (phase-named loading)",
    readyText: "Sorting your ingredients",
    facts: {
      phaseCopy: "Sorting your ingredients… (normalizing phase)",
      hasSkeletonOrShimmer: true,
      noListYet: true,
    },
    prepare: () => seedGroceryState("GROCERY_GENERATING"),
    navigate: gotoGroceries,
  },
  {
    id: "grocery-error",
    briefRef: "groceries — error (reuses Plan's stream-error card)",
    readyText: "The chef got stuck building your list.",
    facts: {
      errorCopy: "The chef got stuck building your list.",
      hasTryAgain: true,
    },
    prepare: () => seedGroceryState("GROCERY_ERROR"),
    navigate: gotoGroceries,
  },
  {
    id: "grocery-manual-mode",
    briefRef: "groceries — ungrouped/manual (notepad) mode with drag handles",
    readyText: "Your list",
    facts: {
      organizeMode: "Ungrouped active",
      flatList: true,
      hasDragHandles: true,
      noAisleHeaders: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByRole("tab", { name: "Ungrouped" }).click();
      await page.getByRole("button", { name: "Drag to reorder" }).first().waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "grocery-checked-gotit",
    briefRef: "groceries — one-zone GOT IT check-off",
    readyText: "Your list",
    facts: {
      checkedItemMovesToGotItZone: true,
      gotItZoneVisible: true,
      progressAdvanced: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByTestId("grocery-row").first().getByRole("checkbox").click();
      await page.getByTestId("grocery-gotit-zone").waitFor({ timeout: 8_000 });
    },
  },
  {
    // Added S52, closing B1. The completion banner was repainted from iOS
    // #30D158 to --spec-success, and it turned out to have NO capture state and
    // no spec assertion of any kind — `grocery-complete-banner` was referenced
    // only by the component that renders it. So the gate was structurally
    // unable to see one of the two surfaces the item changed. Same class as
    // S47's finding that Layer A had never captured a sheet state: the fix is
    // cheap, and the hole is only ever found by asking what the layer CANNOT
    // see rather than reading what it does.
    id: "grocery-complete",
    briefRef: "groceries — every item checked, quiet completion banner",
    readyText: "Your list",
    facts: {
      completionBanner: "List complete — everything's covered.",
      bannerHue: "--spec-success #9CB86F soft fill + line, never iOS #30D158",
      progressReadsFull: true,
      // §7's no-celebration rule: this is the understated moment, not confetti.
      noCelebration: true,
    },
    // SEEDED all-checked rather than driven by clicking each row. The first
    // attempt clicked through the UI and timed out at 120s: a check moves its
    // row into the GOT IT zone, so the loop raced its own re-render — it read a
    // count > 0, then the element it had resolved was gone before the click
    // landed. The seed builder already carries `isChecked` per item, so the
    // deterministic state was one line away.
    prepare: () => seedGroceryState("GROCERY_ALL_CHECKED"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByTestId("grocery-complete-banner").waitFor({ timeout: 8_000 });
    },
  },
  {
    // Added S60. BUG-049 raised six inputs to the 16px iOS zoom floor, and TWO
    // of them live in this row — the name and the quantity. Neither had ever
    // been photographed, because `grocery-row.tsx` renders each slot twice: a
    // display <button> at rest and the <input> only while `editing` is set. The
    // capture drove the row to its resting state every time, so the layer was
    // structurally unable to see either input, and a 0/0 on this surface would
    // have implied a coverage it did not have.
    //
    // The quantity is the one worth a frame rather than the name: it went
    // 13px → 16px (the largest jump of the six) INSIDE a hard `w-[72px]`, which
    // is the shape that bit S58 — a fixed column sized for the type it carried
    // before. The name editor is `w-full` and cannot overflow by construction.
    //
    // Same lesson as `grocery-complete` above, one session later: the hole is
    // only ever found by asking what the layer CANNOT see.
    id: "grocery-row-editing-qty",
    briefRef: "groceries — inline quantity edit (BUG-049's 16px floor, in a fixed 72px column)",
    readyText: "Your list",
    facts: {
      qtyEditorOpen: true,
      qtyEditorFontSize: "16px via .spec-input — below it iOS Safari zooms the viewport on focus",
      qtyEditorWidth: "hard w-[72px]; check a real quantity still reads inside it at the larger size",
      restOfRowUnchanged: true,
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      // Garlic carries "6 clove" — a real two-token quantity rather than a bare
      // numeral, so the shot exercises the width rather than flattering it.
      await page
        .getByTestId("grocery-row")
        .first()
        .getByRole("button", { name: /^6 clove$|^qty$/ })
        .click();
      await page.getByLabel("Edit quantity").waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "grocery-chef-sheet",
    briefRef: "groceries — Talk-to-the-Chef sheet (secondary NL add/query)",
    readyText: "Your list",
    facts: {
      sheetHeadline: "What else do you need?",
      hasSuggestionPills: true,
      hasFreeformField: "spec §09 control: mic + growing field + cream send, all three visible at rest",
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    navigate: async (page) => {
      await gotoReady(page);
      await page.getByTestId("grocery-open-chef").click();
      await page.getByText("What else do you need?", { exact: false }).waitFor({ timeout: 8_000 });
    },
  },
  {
    id: "grocery-offline-clause",
    briefRef: "groceries — offline (1F/C direction 1h, 'The clause')",
    readyText: "Your list",
    facts: {
      clause:
        "`0 / 4 · offline` appended to the count — meta rung, caption colour, NO fill and NO border",
      onlyMark:
        "⚠️ GRADE THE ABSENCES. No banner, no strip, no per-row badge, no second sentence, no queue count. If anything else on this screen mentions offline, that is the defect",
      ticksUnchanged:
        "the tick is pixel-identical to online — same cream fill, same dim-and-strike, no dashed box or clock badge",
      chefProvisional:
        "the toque is the ONLY changed control: hueless .09/.2 provisional under its ORDINARY label, because the header already said why",
      fieldStillLive: "adding still works, the chef does not — the quick-add field is untouched",
    },
    prepare: () => seedGroceryState("GROCERY_READY"),
    // ⚠️ Flipped via the browser's own `offline` event rather than
    // `context.setOffline`, and that is what keeps this state from poisoning
    // every state after it: the capture runner shares ONE page across the whole
    // array, and `onlineManager`'s flag lives in JS memory that the next
    // state's `goto` clears. Cutting the real network would persist on the
    // context and quietly break the rest of the run.
    navigate: async (page) => {
      await gotoReady(page);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
      await page.getByTestId("grocery-offline-clause").waitFor({ timeout: 8_000 });
    },
  },
];
