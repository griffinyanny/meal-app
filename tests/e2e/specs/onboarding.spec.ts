// OB1–OB8: the first-run onboarding interview (Phase 1E, feature #4).
//
// The two paths the scope doc gates the phase on are COMPLETE (OB3/OB4) and
// SKIP (OB5/OB6) — both must set the onboarding-complete flag so the interview
// fires exactly once. The rest cover the gate itself, the mic's honest "not yet"
// answer, and the adaptive deep round's always-available exit.
//
// Assertions go all the way to the database where it matters: a green UI that
// persisted nothing would be the exact failure this feature can't afford, since
// everything downstream (the chef's context, the You tab) reads the rows.
import { test, expect, type Page } from "@playwright/test";
import {
  readOnboardingResult,
  resetTestHousehold,
  seedOnboardingState,
} from "../app/seed";

const confirm = (page: Page) => page.getByTestId("onboarding-confirm");

// Walks the four core turns with a fixed set of answers: 2 adults + 1 baby at
// 6-12 months, pescatarian, shellfish allergy, 30-minute weeknights.
async function answerCoreQuestions(page: Page): Promise<void> {
  await expect(page.getByText("Who am I cooking for?")).toBeVisible();
  await page.getByRole("button", { name: "One more babies under 2" }).click();
  await expect(page.getByTestId("onboarding-baby-stage")).toBeVisible();
  await page.getByTestId("onboarding-baby-stage-6_to_12m").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  await page.getByTestId("onboarding-option-pescatarian").click();
  await confirm(page).click();

  await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
  await page.getByTestId("onboarding-option-shellfish").click();
  await confirm(page).click();

  await expect(page.getByText("How much time on a weeknight?")).toBeVisible();
  await page.getByTestId("onboarding-option-30").click();
  await confirm(page).click();
}

// These specs are the only ones that put the shared test user back into the
// first-run state, and a user left mid-interview would redirect EVERY later
// spec to /welcome. Restoring the onboarded default is therefore part of the
// contract of this file, not just tidiness.
test.afterAll(async () => {
  await seedOnboardingState("ONBOARDING_DONE");
  await resetTestHousehold();
});

test("OB1 - a first-time user is sent into the interview", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/plan");

  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByText("Let's get to know each other. Then I'll cook your week.")
  ).toBeVisible();
  // A conversation, not a destination — the tab bar is gone.
  await expect(page.getByRole("navigation")).toBeHidden();
});

test("OB2 - a user who already onboarded is never re-prompted", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_DONE");
  await page.goto("/plan");

  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText("What are you thinking this week?")).toBeVisible();
});

test("OB3 - completing the interview persists every core answer", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");

  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);

  // Decline the optional deep round — the core alone must be a complete path.
  await expect(page.getByText("Want to go a little deeper?")).toBeVisible();
  await page.getByTestId("onboarding-deepen-no").click();

  await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();
  // The safety recap carries the You tab's vocabulary, including the marker.
  await expect(page.getByText("I'll never cook with")).toBeVisible();
  await expect(page.getByText("allergy")).toBeVisible();

  await page.getByTestId("onboarding-build-plan").click();
  await expect(page).toHaveURL(/\/plan$/);

  const saved = await readOnboardingResult();
  expect(saved.onboardingCompletedAt).not.toBeNull();
  expect(saved.dietaryFramework).toBe("pescatarian");
  expect(saved.maxCookTimeWeeknight).toBe(30);
  expect(saved.restrictions).toEqual(["shellfish (allergy)"]);
  expect(saved.householdComposition).toMatchObject({
    adults: 2,
    children: 0,
    babies: 1,
    babyStage: "6_to_12m",
  });
  // A 6-to-12-month-old eats adapted bites, not a portion, so servings stay 2.
  expect(saved.householdSize).toBe(2);
  // The interview ALWAYS leaves at least one onboarding-stamped memory.
  expect(saved.onboardingMemories.length).toBeGreaterThanOrEqual(1);
  expect(saved.onboardingMemories.join(" ")).toContain("pescatarian");
});

test("OB4 - the completed interview hands off into a pre-seeded plan intent", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");

  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);
  await page.getByTestId("onboarding-deepen-no").click();
  await page.getByTestId("onboarding-build-plan").click();

  await expect(page).toHaveURL(/\/plan$/);
  // Door #3: the real intent screen, pre-filled — not a bespoke onboarding step.
  await expect(page.getByText("YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME")).toBeVisible();
  const chips = page.getByTestId("plan-seed-chips");
  // Capitalized: a chip is a label beside "Under 30 min", not a sentence fragment.
  await expect(chips).toContainText("Pescatarian");
  await expect(chips).toContainText("Under 30 min");
  // ⚠️ This asserted `plan-build-first-week` until S57, when that button was
  // deleted: the field arrives pre-filled, so it and the §09 send fired the
  // same call with the same argument — one action drawn twice, and two filled
  // cream buttons in one viewport (§08). Asserting the FIELD instead is the
  // stronger check anyway: the hand-off's promise is that the interview's
  // sentence survives the trip into the real intent screen, and a button's
  // presence never proved that. This can now fail on a hand-off that lands but
  // carries nothing.
  await expect(page.getByTestId("plan-intent-input")).toHaveValue(/.+/);
  await expect(page.getByTestId("plan-intent-send")).toBeVisible();
});

test("OB5 - skipping from the intro sets the flag and lands in the app", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");

  await page.getByTestId("onboarding-skip-all").click();
  await expect(page).toHaveURL(/\/plan$/);

  const saved = await readOnboardingResult();
  // Skip is first-class: same flag, but nothing invented on the user's behalf.
  expect(saved.onboardingCompletedAt).not.toBeNull();
  expect(saved.onboardingMemories).toHaveLength(0);
  expect(saved.dietaryFramework).toBeNull();
});

test("OB6 - a skipped interview does not fire again on the next visit", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-skip-all").click();
  await expect(page).toHaveURL(/\/plan$/);

  await page.goto("/plan");
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText("What are you thinking this week?")).toBeVisible();
});

test("OB7 - the mic says voice is coming rather than failing silently", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();

  await page.getByRole("button", { name: "Answer by voice" }).click();

  await expect(page.getByTestId("onboarding-toast")).toContainText("Voice is coming soon");
});

test("OB9 - typing an answer lights the pill instead of only echoing a sentence", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  await page.getByTestId("onboarding-tell-me-input").fill("we are going vegan");
  await page.getByTestId("onboarding-tell-me-send").click();

  // The screen's own statement of what it heard is the pill, so an answer given
  // in words has to move it.
  await expect(page.getByTestId("onboarding-option-vegan")).toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 20_000 }
  );
  // ...and having lit the pill, the tray doesn't say the same thing again.
  await expect(page.getByTestId("onboarding-caught-tray")).toBeHidden();
});

test("OB10 - the tray itemizes what free text surfaced beyond the pills", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  await page.getByTestId("onboarding-tell-me-input").fill("I love Thai food");
  await page.getByTestId("onboarding-tell-me-send").click();

  const tray = page.getByTestId("onboarding-caught-tray");
  await expect(tray).toBeVisible({ timeout: 20_000 });
  // The cuisine itself, not the chef's reply sentence about it.
  await expect(tray).toContainText("Thai");
  await expect(tray).not.toContainText("Added Thai to your cuisines");
});

test("OB11 - free text about something else never answers the question on screen", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  // Says nothing about diet. The write still creates the preferences row, whose
  // dietary_framework column defaults to "omnivore" — so a screen that trusted
  // the row would light "No restrictions" over an unanswered question. Caught
  // on the real model in the Layer-B capture, invisible to the mock fixture.
  await page.getByTestId("onboarding-tell-me-input").fill("we do taco night every Tuesday");
  await page.getByTestId("onboarding-tell-me-send").click();

  await expect(page.getByTestId("onboarding-caught-tray")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("onboarding-option-omnivore")).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  // Still unanswered, so there is nothing to confirm yet.
  await expect(page.getByTestId("onboarding-confirm")).toBeHidden();
});

test("OB12 - a spoken correction beats an earlier tap, and is what gets saved", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  await page.getByTestId("onboarding-option-pescatarian").click();
  // Then change their mind out loud. The chef applied it; the screen has to
  // agree, and the confirm has to persist the correction rather than the tap.
  await page.getByTestId("onboarding-tell-me-input").fill("actually we are not pescatarian");
  await page.getByTestId("onboarding-tell-me-send").click();

  await expect(page.getByTestId("onboarding-option-omnivore")).toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 20_000 }
  );
  // Exactly one answer is lit — two would make the confirm a coin flip.
  await expect(page.getByTestId("onboarding-option-pescatarian")).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await confirm(page).click();
  await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
  await page.getByTestId("onboarding-pass").click();
  await expect(page.getByText("How much time on a weeknight?")).toBeVisible();
  await page.getByTestId("onboarding-option-30").click();
  await confirm(page).click();
  await page.getByTestId("onboarding-deepen-no").click();
  await page.getByTestId("onboarding-build-plan").click();
  await expect(page).toHaveURL(/\/plan$/);

  const saved = await readOnboardingResult();
  expect(saved.dietaryFramework).toBe("omnivore");
});

test("OB13 - a retracted allergy does not come back on confirm", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();
  await page.getByTestId("onboarding-option-pescatarian").click();
  await confirm(page).click();

  await expect(page.getByText("Anything I should never cook with?")).toBeVisible();
  await page.getByTestId("onboarding-tell-me-input").fill("I'm allergic to peanuts");
  await page.getByTestId("onboarding-tell-me-send").click();
  await expect(page.getByTestId("onboarding-option-peanuts")).toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 20_000 }
  );

  // Take it back. Over-restricting is the safer error direction, but it still
  // contradicts the user's last word on the one screen built for trust.
  await page.getByTestId("onboarding-tell-me-input").fill("actually remove peanuts");
  await page.getByTestId("onboarding-tell-me-send").click();
  await expect(page.getByTestId("onboarding-option-peanuts")).toHaveAttribute(
    "aria-pressed",
    "false",
    { timeout: 20_000 }
  );
});

// OB14/OB15 are the two failure paths that matter more here than anywhere else
// in the app: the interview fires exactly ONCE per account, so an answer lost to
// a dropped connection is not something the user can re-run their way out of.
// Both drive the failure for real (aborted requests), not a mocked error state.

test("OB14 - a failed capture keeps what you typed (BUG-014)", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.route("**/api/trpc/user.talk*", (route) => route.abort());

  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-confirm-household").click();

  await expect(page.getByText("How do you eat?")).toBeVisible();
  const field = page.getByTestId("onboarding-tell-me-input");
  await field.fill("we are going vegan");
  await page.getByTestId("onboarding-tell-me-send").click();

  await expect(page.getByTestId("onboarding-toast")).toContainText(
    "didn't catch that"
  );
  // The toast says "try again" — so there has to be something left to try
  // again with. Retyping on a phone is the worst outcome on the first screen a
  // user ever sees.
  await expect(field).toHaveValue("we are going vegan");
});

test("OB15 - a core answer that fails to save is not reported as saved, and is retried (BUG-016)", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");

  // Drop only the FIRST preference write — the household turn — and let
  // everything after it through. That is what a connection blip mid-interview
  // actually looks like, and it used to pass completely unmentioned.
  let dropped = false;
  await page.route("**/api/trpc/user.updatePreferences*", (route) => {
    if (!dropped) {
      dropped = true;
      return route.abort();
    }
    return route.continue();
  });

  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);
  await page.getByTestId("onboarding-deepen-no").click();

  await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();
  // The claim the old build made regardless of what actually landed.
  await expect(page.getByText("All saved.")).toBeHidden();
  await expect(page.getByTestId("onboarding-unsaved-note")).toContainText(
    "who I'm cooking for"
  );

  // The retry happens on the button the user was going to press anyway.
  await page.getByTestId("onboarding-build-plan").click();
  await expect(page).toHaveURL(/\/plan$/);

  const saved = await readOnboardingResult();
  expect(saved.onboardingCompletedAt).not.toBeNull();
  // The whole point: the dropped answer is in the database, not gone.
  expect(saved.householdComposition).toMatchObject({
    adults: 2,
    babies: 1,
    babyStage: "6_to_12m",
  });
  expect(saved.dietaryFramework).toBe("pescatarian");
});

test("OB8 - the deep round is adaptive and always offers a way out", async ({ page }) => {
  await seedOnboardingState("ONBOARDING_NEW");
  await page.goto("/welcome");

  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);
  await page.getByTestId("onboarding-deepen-yes").click();

  // The planner opens on its highest-value question and shows the honest
  // "why we ask" line plus the optional-value meter.
  await expect(page.getByText("How much heat do you actually want?")).toBeVisible();
  await expect(page.getByTestId("onboarding-value-meter")).toBeVisible();
  await expect(page.getByText("Spice is the thing people most often")).toBeVisible();

  // Nothing captured yet, so the meter starts empty — it measures signal, not
  // questions survived.
  await expect(page.getByTestId("onboarding-value-meter-fill")).toHaveCSS("width", "0px");

  await page.getByTestId("onboarding-option-hot").click();
  await confirm(page).click();

  // A second, DIFFERENT question — the round adapts rather than repeating.
  await expect(page.getByText("How much heat do you actually want?")).toBeHidden();

  // ...and the meter has actually moved, now that an answer carried signal.
  await expect(page.getByTestId("onboarding-value-meter-fill")).not.toHaveCSS(
    "width",
    "0px"
  );
  await expect(page.getByTestId("onboarding-good-for-now")).toBeVisible();

  await page.getByTestId("onboarding-good-for-now").click();
  await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();

  await page.getByTestId("onboarding-build-plan").click();
  await expect(page).toHaveURL(/\/plan$/);

  const saved = await readOnboardingResult();
  // The deep answer became its own onboarding memory alongside the headline.
  expect(saved.onboardingMemories.length).toBeGreaterThanOrEqual(2);
  expect(saved.onboardingMemories.join(" ").toLowerCase()).toContain("heat");
});

// OB16 - BUG-020. The honest-about-saves contract (BUG-016, OB15 above) reached
// through the one path that fix did not cover.
//
// `retryFailed` retried FAILED saves but never awaited IN-FLIGHT ones, and a
// save that has not landed yet is in neither bucket — so tapping through fast
// enough meant `finishOnboarding` succeeded, the flag was written, and the
// pending save then failed with nothing left to retry and no surface to say so.
//
// The in-flight window is held open by a gate the TEST releases, rather than by
// racing a timer: the whole bug is about a specific interleaving, and a spec
// that reproduced it only on a slow machine would be worse than no spec.
test("OB16 - a save still in flight is awaited before the interview reports success (BUG-020)", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  // The 4th core write is the weeknight-time turn — the last one before the
  // deepen offer, and therefore the one that can still be open on reflect.
  let seen = 0;
  await page.route("**/api/trpc/user.updatePreferences*", async (route) => {
    seen += 1;
    if (seen === 4) {
      await held;
      return route.abort();
    }
    return route.continue();
  });

  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);
  await page.getByTestId("onboarding-deepen-no").click();
  await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();

  // Tapped while the save is still open — guaranteed, not raced.
  await page.getByTestId("onboarding-build-plan").click();
  release();

  // The end point awaits the open save, sees it fail, retries it, and only then
  // lets the user out — so the interview still completes.
  await expect(page).toHaveURL(/\/plan$/, { timeout: 20_000 });

  const saved = await readOnboardingResult();
  expect(saved.onboardingCompletedAt).not.toBeNull();
  // THE ASSERTION THAT FALSIFIES THE BUG. The old code reported "all clear"
  // while this write was still open, wrote the completed flag, and left — and
  // because the flag makes the interview fire exactly once per account, the
  // answer was gone for good with no surface left to retry it on. Awaiting the
  // in-flight save is what turns that permanent loss back into a retry.
  expect(saved.maxCookTimeWeeknight).toBe(30);
});

// OB18 - BUG-020's other half. When the end-point retry ALSO fails there is
// nothing left to try, so the interview must stay put rather than write the
// once-per-account flag over an answer it never saved.
test("OB18 - an in-flight save that cannot be recovered keeps the user in the interview (BUG-020)", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  // Drop the 4th write AND every attempt after it: the connection is gone, not
  // blipping. OB16 covers the blip.
  let seen = 0;
  await page.route("**/api/trpc/user.updatePreferences*", async (route) => {
    seen += 1;
    if (seen === 4) {
      await held;
      return route.abort();
    }
    if (seen > 4) return route.abort();
    return route.continue();
  });

  await page.goto("/welcome");
  await page.getByTestId("onboarding-start").click();
  await answerCoreQuestions(page);
  await page.getByTestId("onboarding-deepen-no").click();
  await expect(page.getByTestId("onboarding-reflect-hook")).toBeVisible();

  await page.getByTestId("onboarding-build-plan").click();
  release();

  await expect(page.getByTestId("onboarding-toast")).toContainText(
    "Still can't reach the kitchen",
    { timeout: 20_000 }
  );
  await expect(page).toHaveURL(/\/welcome$/);
  // The flag is what makes the interview fire once. Writing it here would end
  // the user's only chance to give this answer.
  expect((await readOnboardingResult()).onboardingCompletedAt).toBeNull();
});

// OB17 - BUG-021. `skipAll` routed onSuccess AND onError to the same
// `leaveToPlan`, so a failed skip left `onboardingCompletedAt` NULL and the
// first-run gate sent the user straight back into the interview on their next
// load, with nothing explaining why "Skip for now" did not stick.
//
// No data is lost (unlike a failed finish), which is why this is 🟠 — but a
// control that silently does not work is a trust bug on a first run.
test("OB17 - a skip that fails stays put with a retry, instead of pretending it worked (BUG-021)", async ({
  page,
}) => {
  await seedOnboardingState("ONBOARDING_NEW");

  let dropped = false;
  await page.route("**/api/trpc/user.skipOnboarding*", (route) => {
    if (!dropped) {
      dropped = true;
      return route.abort();
    }
    return route.continue();
  });

  await page.goto("/welcome");
  await page.getByTestId("onboarding-skip-all").click();

  await expect(page.getByTestId("onboarding-toast")).toContainText(
    "couldn't skip",
    { timeout: 10_000 }
  );
  await expect(page).toHaveURL(/\/welcome$/);
  expect((await readOnboardingResult()).onboardingCompletedAt).toBeNull();

  // The retry is the same control, and this time it lands.
  await page.getByTestId("onboarding-skip-all").click();
  await expect(page).toHaveURL(/\/plan$/);
  expect((await readOnboardingResult()).onboardingCompletedAt).not.toBeNull();
});
