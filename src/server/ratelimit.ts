// Best-effort in-memory rate limiter. On serverless this is per-instance, not
// global, but that's sufficient for V1's threat model: guarding against a bug
// (or a single client) looping expensive AI calls and burning the provider key.
// A distributed limiter (e.g. Upstash) is deferred to Production Readiness.
// The daily budget below IS distributed (Postgres-backed) and is the hard cap.
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/server/db/schema";
import { aiUsageDaily } from "@/server/db/schema";

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

// Shared limit for AI-calling operations: per user, per minute.
export const AI_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;

export function checkAiRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`ai:${userId}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs);
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
