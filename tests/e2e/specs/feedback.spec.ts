// FB — in-app feedback capture (Phase 1F Workstream E, docs/test-plan.md).
//
// The feature's whole promise is "describe the problem, never the state", which
// means the PAYLOAD is the thing under test. A spec that asserts only "a row was
// written" passes against a build that attaches nothing — the feature failing
// completely, silently, while the sheet still says Sent ✓.
import { test, expect } from "@playwright/test";
import {
  seedGroceryState,
  seedPlanState,
  readLatestFeedback,
  resetTestHousehold,
} from "../app/seed";

test.afterAll(async () => {
  await resetTestHousehold();
});

test("FB1 - the trigger is gated on DEV_TOOLS_EMAILS, not on the debug-HUD flag", async ({
  page,
}) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");

  // ⚠️ THE DISTINCTION THIS SPEC EXISTS TO PIN. E0 originally scoped the control
  // onto the debug HUD's 🐛, on the premise that the HUD is "behind
  // DEV_TOOLS_EMAILS". It is not: `hudEnabled()` reads NODE_ENV, a build flag,
  // or a localStorage key — none of which is reachable inside an installed iOS
  // PWA, which is the exact situation this feature exists for. The suite runs
  // with DEV_TOOLS_EMAILS set and the HUD flag UNSET, so the two gates are
  // observably different here: the feedback control is present and the 🐛 is not.
  await expect(page.getByTestId("feedback-trigger")).toBeVisible();
  await expect(page.getByTestId("debug-hud-toggle")).toHaveCount(0);
});

test("FB2 - a report carries the route, the ring buffer and the capture time it was opened at", async ({
  page,
}) => {
  await seedGroceryState("GROCERY_READY");
  await page.goto("/groceries");

  // ⚠️ WAIT ON THE ROWS, NOT THE HEADING — S56's "waiting on a surface is not
  // waiting on its data", which this spec walked straight into.
  //
  // The first version waited on `heading level 1`. BUG-054's fix moved the
  // Groceries `<h1>` into `GroceryTitle`, which renders on the loading and
  // error paths too — so the heading appears while `grocery.current` is still
  // IN FLIGHT. The ring buffer only records a call when it settles, so the
  // report was captured with an empty buffer. **It passed in isolation and
  // failed in the full 163-spec run**, because the race is only lost under
  // load: the classic shape (S53/S65) where a green isolated run proves
  // nothing. Rows on screen prove the query came back.
  await expect(page.getByTestId("grocery-row").first()).toBeVisible();

  await page.getByTestId("feedback-trigger").click();
  await expect(page.getByTestId("feedback-sheet")).toBeVisible();

  await page
    .getByTestId("feedback-body")
    .fill("Ticking an item bounced it back after a second");
  await page.getByTestId("feedback-send").click();
  await expect(page.getByTestId("feedback-send")).toContainText("Sent");

  const row = await readLatestFeedback();
  expect(row, "no feedback row was written").not.toBeNull();
  expect(row!.body).toBe("Ticking an item bounced it back after a second");
  expect(row!.imagePath).toBeNull();
  // The sweep's idempotency depends on this: without `new` it re-files every
  // report, every session.
  expect(row!.status).toBe("new");

  const payload = row!.payload;
  expect(payload.route).toBe("/groceries");
  expect(payload.capturedAt).toEqual(expect.any(String));

  // Server-stamped, and unforgeable by the client — "is this real usage or a
  // seeded run" is what decides whether a report is evidence.
  expect(payload.environment).toBe("development");
  expect(payload.aiMock).toBe(true);

  // The debug panel Workstream E added to Groceries. Its absence would mean the
  // payload is `{}` on the surface used standing in a shop.
  const panels = payload.debugPanels as Record<string, unknown>;
  expect(Object.keys(panels)).toContain("groceries");

  const calls = payload.trpcCalls as Array<Record<string, unknown>>;
  expect(calls.length, "the ring buffer recorded nothing").toBeGreaterThan(0);
  expect(calls.some((c) => c.path === "grocery.current")).toBe(true);
  // ⚠️ BUG-060'S CLASS, ASSERTED AT THE ONLY LAYER THAT SEES REAL DATA. The unit
  // test pins the schema's shape; this pins what actually landed in the database
  // after a real session with a real seeded list in it.
  for (const call of calls) {
    expect(Object.keys(call).sort()).toEqual([
      "durationMs",
      "msBeforeCapture",
      "ok",
      "path",
      "type",
    ]);
  }
  const serialized = JSON.stringify(calls);
  expect(serialized).not.toContain("Garlic");
});

test("FB3 - a failed submit keeps the typed report and offers a retry", async ({
  page,
}) => {
  await seedPlanState("EMPTY");
  await page.goto("/plan");

  await page.getByTestId("feedback-trigger").click();
  const body = page.getByTestId("feedback-body");
  await body.fill("The intent field cleared itself while I was typing");

  // ⚠️ BUG-014's LESSON, AND ITS WORST POSSIBLE INSTANCE. Losing typed text on
  // error was already found and fixed once in this project; losing a BUG REPORT
  // to a bug is that failure at the one moment the reporter is most annoyed and
  // least likely to retype it. Nothing may clear the draft except a confirmed
  // success.
  await page.route("**/api/trpc/**", (route) => route.abort("failed"));
  await page.getByTestId("feedback-send").click();

  await expect(page.getByTestId("feedback-error")).toBeVisible();
  await expect(page.getByTestId("feedback-sheet")).toBeVisible();
  await expect(body).toHaveValue(
    "The intent field cleared itself while I was typing"
  );
  await expect(page.getByTestId("feedback-send")).toBeEnabled();
});
