// Playwright "setup" project — runs once before the suite (the mobile-chromium
// project depends on it). Mints a real Supabase session for the dedicated test
// user, bootstraps the minimum functioning rows (users + household + membership,
// mirroring user.ensureOnboarded), and persists storageState + the test-context
// ids for the seed helpers.
import { test as setup } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../../src/server/db/schema";
import { makeSeedDb } from "../harness/seed-client";
import {
  mintSupabaseSession,
  sessionToStorageState,
  type SupabaseAuthConfig,
} from "../harness/supabase-session";
import {
  env,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_HOUSEHOLD_NAME,
} from "./env";
import { writeTestContext, writeStorageState } from "./test-context";

setup("mint session + bootstrap test household", async () => {
  const authCfg: SupabaseAuthConfig = {
    supabaseUrl: env.supabaseUrl,
    anonKey: env.anonKey,
    databaseUrl: env.databaseUrl,
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  };

  const { userId, session } = await mintSupabaseSession(authCfg);

  const { db, close } = makeSeedDb(env.databaseUrl, schema);
  try {
    // The harness's DEFAULT identity is an already-onboarded user. Since Phase
    // 1E the app redirects anyone with a NULL onboardingCompletedAt into the
    // first-run interview, so leaving it null here would bounce every spec in
    // the suite to /welcome before it could reach the tab it's testing. The
    // onboarding specs opt into the first-run state explicitly via
    // seedOnboardingState("ONBOARDING_NEW") and restore this default after.
    await db
      .insert(schema.users)
      .values({
        id: userId,
        email: TEST_USER_EMAIL,
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: TEST_USER_EMAIL,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // One household per user (unique index on user_id). Reuse the existing
    // membership if present; otherwise create the isolated test household.
    const existing = await db.query.householdMembers.findFirst({
      where: eq(schema.householdMembers.userId, userId),
    });

    let householdId: string;
    if (existing) {
      householdId = existing.householdId;
      // Keep the sentinel name current so the seed safety guard passes.
      await db
        .update(schema.households)
        .set({ name: TEST_HOUSEHOLD_NAME, updatedAt: new Date() })
        .where(eq(schema.households.id, householdId));
    } else {
      const [household] = await db
        .insert(schema.households)
        .values({ name: TEST_HOUSEHOLD_NAME })
        .returning();
      householdId = household.id;
      await db.insert(schema.householdMembers).values({
        householdId,
        userId,
        role: "owner",
      });
    }

    writeTestContext({ userId, householdId });
  } finally {
    await close();
  }

  const storageState = await sessionToStorageState(authCfg, session);
  writeStorageState(storageState);
});
