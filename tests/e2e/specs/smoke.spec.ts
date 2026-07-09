import { test, expect } from "@playwright/test";

// Proves the auth bypass works end-to-end: a minted-session cookie survives the
// proxy's presence check, the layout's real getClaims() verification, and the
// OnboardGuard, landing on a rendered /plan. The EMPTY test household shows the
// intent screen. No seeding here — this is the auth smoke.
test("authenticated /plan renders", async ({ page }) => {
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", { name: "What are you thinking this week?" })
  ).toBeVisible();
});
