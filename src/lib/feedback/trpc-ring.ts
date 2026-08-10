// Recent-tRPC-calls ring buffer for the feedback payload (1F/E, E0 call 5).
//
// WHY IT EXISTS: a report says "it just spun and then said I had no list". The
// single most useful thing to know is what the client asked for in the seconds
// before that, and whether it came back. Sentry sees thrown errors and PostHog
// sees named events; neither sees "grocery.current took 41ms and came back not
// ok, twice, right before he gave up".
//
// ⚠️⚠️ PATH, TYPE, OK AND DURATION. NEVER INPUTS. NEVER OUTPUTS. ⚠️⚠️
//
// This is BUG-060's class arriving through a new door, and it is written down
// here because the widening edit is the *reasonable-looking* one: "log the input
// too, it would make reports easier to diagnose" is a sentence someone will say,
// and it would put the grocery list, the week's meal titles and the household's
// dietary constraints into a database table through a channel nobody is
// watching. That is exactly how templated `aria-label`s put them into session
// replay while every visible string beside them was correctly masked.
//
// `op.input` is available on every operation below and is deliberately not read.
// `trpcCallSchema` has no field that could hold it, and `feedback.test.ts`
// asserts the shape stays closed — a constraint by construction, plus a guard,
// because a comment alone has never stopped this project's recurring bugs.
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/trpc/root";
import { TRPC_RING_SIZE, type TrpcCall } from "./payload";

interface Entry {
  path: string;
  type: TrpcCall["type"];
  ok: boolean;
  durationMs: number;
  at: number;
}

// Module-level: the buffer must outlive any component, because the report is
// filed from a sheet that mounts *after* the interesting calls have happened.
let ring: Entry[] = [];

function record(entry: Entry): void {
  ring.push(entry);
  if (ring.length > TRPC_RING_SIZE) ring = ring.slice(-TRPC_RING_SIZE);
}

/**
 * Read the buffer as payload entries, oldest first.
 *
 * Times are expressed as "how long before capture", not as wall-clock stamps:
 * the report is read days later, and `1400ms before he hit report` is the
 * legible fact, where a timestamp is arithmetic the reader has to do.
 */
export function readTrpcRing(now: number = Date.now()): TrpcCall[] {
  return ring.map(({ path, type, ok, durationMs, at }) => ({
    path,
    type,
    ok,
    durationMs,
    msBeforeCapture: Math.max(0, now - at),
  }));
}

/** Test-only reset. The buffer is module state and would leak between cases. */
export function clearTrpcRing(): void {
  ring = [];
}

/**
 * The link. Sits at the end of the chain so it measures the whole round trip
 * including batching, which is what the user actually waited for.
 */
export const trpcRingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const startedAt = Date.now();
      let settled = false;

      // One entry per operation. `complete` fires after `next` on a successful
      // query, so without this a single call would record twice.
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        record({
          // ⚠️ op.path and op.type ONLY. op.input is right here and is not read.
          path: op.path,
          type: op.type,
          ok,
          durationMs: Date.now() - startedAt,
          at: startedAt,
        });
      };

      const subscription = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          settle(false);
          observer.error(err);
        },
        complete() {
          settle(true);
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  };
};
