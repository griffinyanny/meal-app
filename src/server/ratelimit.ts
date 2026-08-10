// Best-effort in-memory rate limiter. On serverless this is per-instance, not
// global, but that's sufficient for V1's threat model: guarding against a bug
// (or a single client) looping expensive AI calls and burning the provider key.
// A distributed limiter (e.g. Upstash) is deferred to Production Readiness.
// The daily budget below IS distributed (Postgres-backed) and is the hard cap.
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/server/db/schema";
import { aiUsageDaily } from "@/server/db/schema";
import { aiMockEnabled } from "@/server/ai/providers/e2e-mock";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Shared limit for INTERACTIVE AI-calling operations (plan generate/modify,
// hydrate, grocery talk): per user, per minute. This is the user-visible,
// must-succeed path — a 429 here fails something the user is watching.
export const AI_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;

export function checkAiRateLimit(userId: string): RateLimitResult {
  // E2E runs many AI-gated calls back-to-back; the mock makes them free, so the
  // per-minute guard would only produce false failures. Relaxed only under the
  // (double-gated) mock flag — the real limit is untouched in every other run.
  const limit = aiMockEnabled() ? 1000 : AI_RATE_LIMIT.limit;
  return checkRateLimit(`ai:${userId}`, limit, AI_RATE_LIMIT.windowMs);
}

// Separate bucket for BACKGROUND, best-effort AI fan-out — today the review-time
// grocery normalize (BUG-004), which fires one call per hydrated recipe. Kept
// distinct from the interactive bucket for two reasons: (1) it must never consume
// interactive tokens and 429 a user-visible hydrate; (2) a full-week review
// legitimately fans out ~7 (plus prioritize re-fires), which would blow the 10/min
// interactive cap. Sized to cover a week comfortably while still bounding a runaway
// loop. A 429 here is harmless — the caller (cacheSlotNormalization) is best-effort,
// so the recipe just falls back to normalizing at confirm.
export const AI_BG_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const;

export function checkAiBackgroundRateLimit(userId: string): RateLimitResult {
  const limit = aiMockEnabled() ? 1000 : AI_BG_RATE_LIMIT.limit;
  return checkRateLimit(`ai:bg:${userId}`, limit, AI_BG_RATE_LIMIT.windowMs);
}

// In-app feedback submission (1F/E). Not an AI path and not expensive, so this
// bucket exists for one reason only: a retry loop. The capture sheet keeps the
// typed text and offers a manual retry on failure (BUG-014), so the caller is a
// person tapping a button — 20 in five minutes is far beyond any real reporting
// burst and still bounds a client bug that retries forever.
// ⚠️ A 429 here must not read as "your report was lost": the sheet keeps the
// body, and the message says to wait rather than implying failure.
export const FEEDBACK_RATE_LIMIT = { limit: 20, windowMs: 300_000 } as const;

export function checkFeedbackRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(
    `feedback:${userId}`,
    FEEDBACK_RATE_LIMIT.limit,
    FEEDBACK_RATE_LIMIT.windowMs
  );
}

// Distributed daily budget, enforced in Postgres so it holds across serverless
// instances (unlike the in-memory per-minute limiter above). Atomic upsert —
// concurrent calls each get the true post-increment count, no read-then-write
// race. Day boundary is UTC.
export const AI_DAILY_BUDGET = { calls: 150 } as const;

export interface DailyBudgetResult {
  allowed: boolean;
  used: number;
}

export async function consumeDailyAiBudget(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  householdId: string
): Promise<DailyBudgetResult> {
  const day = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .insert(aiUsageDaily)
    .values({ userId, householdId, day, calls: 1 })
    .onConflictDoUpdate({
      target: [aiUsageDaily.userId, aiUsageDaily.day],
      set: {
        calls: sql`${aiUsageDaily.calls} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ calls: aiUsageDaily.calls });

  return { allowed: row.calls <= AI_DAILY_BUDGET.calls, used: row.calls };
}
