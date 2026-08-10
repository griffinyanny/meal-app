import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { observable } from "@trpc/server/observable";
import { trpcRingLink, readTrpcRing, clearTrpcRing } from "./trpc-ring";
import { TRPC_RING_SIZE } from "./payload";

type Op = { path: string; type: "query" | "mutation"; input?: unknown };

// Drives the link the way @trpc/client does: hand it an operation and a
// terminating `next` that either completes or errors.
function run(op: Op, outcome: "ok" | "error"): Promise<void> {
  const link = trpcRingLink({} as never);
  return new Promise((resolve) => {
    link({
      op: { ...op, id: 1, context: {}, signal: null } as never,
      next: () =>
        observable((observer) => {
          if (outcome === "ok") {
            observer.next({ result: { data: null } } as never);
            observer.complete();
          } else {
            observer.error({ message: "boom" } as never);
          }
        }),
    }).subscribe({
      next: () => {},
      error: () => resolve(),
      complete: () => resolve(),
    });
  });
}

describe("trpcRingLink", () => {
  beforeEach(() => clearTrpcRing());
  afterEach(() => vi.useRealTimers());

  it("should record a successful call once", async () => {
    await run({ path: "grocery.current", type: "query" }, "ok");

    const ring = readTrpcRing();
    expect(ring).toHaveLength(1);
    expect(ring[0]).toMatchObject({
      path: "grocery.current",
      type: "query",
      ok: true,
    });
  });

  // `complete` fires after `next` on a successful query, so a naive
  // implementation records the same call twice and the buffer reports twice the
  // traffic that happened.
  it("should not double-record a call that emits then completes", async () => {
    await run({ path: "plan.current", type: "query" }, "ok");
    expect(readTrpcRing()).toHaveLength(1);
  });

  it("should record a failed call as not ok", async () => {
    await run({ path: "grocery.current", type: "query" }, "error");

    const ring = readTrpcRing();
    expect(ring).toHaveLength(1);
    expect(ring[0]).toMatchObject({ path: "grocery.current", ok: false });
  });

  it("should keep only the most recent TRPC_RING_SIZE calls, oldest first", async () => {
    for (let i = 0; i < TRPC_RING_SIZE + 5; i += 1) {
      await run({ path: `call.${i}`, type: "query" }, "ok");
    }

    const ring = readTrpcRing();
    expect(ring).toHaveLength(TRPC_RING_SIZE);
    expect(ring[0].path).toBe("call.5");
    expect(ring.at(-1)?.path).toBe(`call.${TRPC_RING_SIZE + 4}`);
  });

  it("should express age as milliseconds before capture, never a timestamp", async () => {
    await run({ path: "plan.current", type: "query" }, "ok");

    const [entry] = readTrpcRing(Date.now() + 1400);
    expect(entry.msBeforeCapture).toBeGreaterThanOrEqual(1400);
    expect(entry).not.toHaveProperty("at");
  });

  // ⚠️ THE ONE THAT MATTERS. The widening edit is the reasonable-sounding one —
  // "log the input too, it would help diagnose reports" — and it would put the
  // grocery list, the week's meal titles and the household's dietary
  // constraints into a database table through a channel nobody is watching.
  // That is BUG-060's mechanism exactly, one door over.
  it("should never record a call's input or output", async () => {
    await run(
      {
        path: "grocery.addItem",
        type: "mutation",
        input: { name: "Garlic", quantity: "3 cloves" },
      },
      "ok"
    );

    const serialized = JSON.stringify(readTrpcRing());
    expect(serialized).not.toContain("Garlic");
    expect(serialized).not.toContain("cloves");
    expect(Object.keys(readTrpcRing()[0]).sort()).toEqual([
      "durationMs",
      "msBeforeCapture",
      "ok",
      "path",
      "type",
    ]);
  });

  // The assertion above can only fail if the value happens to be in the buffer.
  // This one fails if the SOURCE ever learns to read `op.input` at all, which is
  // the edit itself rather than one of its consequences — and it catches a
  // rename or a spread that the value-level check would walk past.
  it("should not reference op.input anywhere in the source", () => {
    const source = readFileSync(join(__dirname, "trpc-ring.ts"), "utf8");
    // Strip comments: this file's own prose names the symbol it forbids, which
    // is the fourth time in this project a guard has failed against its own
    // documentation (BUG-049's note).
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(code).toContain("op.path");
    expect(code).not.toContain("op.input");
  });
});
