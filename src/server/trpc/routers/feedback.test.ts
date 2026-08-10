import { describe, it, expect, vi, beforeEach } from "vitest";
import { feedbackRouter } from "./feedback";
import { feedback } from "@/server/db/schema";
import type { ClientPayload } from "@/server/db/schema";
import { FEEDBACK_RATE_LIMIT } from "@/server/ratelimit";
import {
  createMockDb,
  buildCtx,
  makeUser,
  type MockDb,
  type Chain,
} from "./grocery-test-utils";

const FEEDBACK_ID = "44444444-4444-4444-8444-444444444444";

// The rate limiter's buckets are module-level and keyed by user id, so every
// test that submits gets its own user — otherwise an earlier test's submissions
// count against a later one and the failure looks like a product bug.
let seq = 0;
function freshUser() {
  seq += 1;
  return makeUser(`feedback-user-${seq}`);
}

function authed(db: MockDb) {
  db.query.householdMembers.findFirst.mockResolvedValue({
    householdId: "household-1",
  });
}

function payload(overrides: Partial<ClientPayload> = {}): ClientPayload {
  return {
    route: "/groceries",
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone)",
    standalone: true,
    buildSha: "abc1234",
    replayUrl: "https://us.posthog.com/replay/session-1",
    sentryEventId: null,
    debugPanels: { grocery: { itemCount: 12 } },
    trpcCalls: [
      {
        path: "grocery.current",
        type: "query",
        ok: false,
        durationMs: 41,
        msBeforeCapture: 1400,
      },
    ],
    capturedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function insertedRow(db: MockDb) {
  const chain = db.insert.mock.results.at(-1)?.value as Chain;
  return chain.values.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

describe("feedbackRouter.submit", () => {
  let db: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    db.__insertReturning.set(feedback, [{ id: FEEDBACK_ID }]);
  });

  it("should reject an unauthenticated request", async () => {
    const caller = feedbackRouter.createCaller(buildCtx(db, null));
    await expect(
      caller.submit({ body: "the list is empty", payload: payload() })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("should reject an empty body", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));
    await expect(
      caller.submit({ body: "   ", payload: payload() })
    ).rejects.toThrow();
  });

  it("should store the report with the household and user from ctx", async () => {
    authed(db);
    const user = freshUser();
    const caller = feedbackRouter.createCaller(buildCtx(db, user));

    const result = await caller.submit({
      body: "Ticking an item bounces it back",
      payload: payload(),
    });

    expect(result).toEqual({ id: FEEDBACK_ID });
    expect(insertedRow(db)).toMatchObject({
      householdId: "household-1",
      userId: user.id,
      body: "Ticking an item bounces it back",
      imagePath: null,
    });
  });

  // Door 2's whole discipline in one assertion: RLS does not filter the app's
  // own connection, so a caller-supplied householdId reaching the insert would
  // have nothing underneath it. It must be structurally unable to.
  it("should ignore a householdId supplied by the caller", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));

    await caller.submit({
      body: "hostile",
      householdId: "someone-elses-household",
      payload: payload(),
    } as Parameters<typeof caller.submit>[0]);

    expect(insertedRow(db)).toMatchObject({ householdId: "household-1" });
  });

  // ⚠️ ASSERTS THE MESSAGE, NOT JUST THE CODE, and that is not pedantry — it was
  // caught by force-failure. Zod input-validation failures also surface as
  // BAD_REQUEST, so while two planted defects overlapped, this test PASSED
  // against a router whose prefix check had been disabled: a validation error
  // satisfied `{ code: "BAD_REQUEST" }` and looked exactly like the guard
  // firing. An assertion loose enough for a different failure to satisfy is the
  // same family as S61's "a force-failure that does not reproduce the real
  // defect is a green with extra steps".
  it("should reject an image path outside the caller's own prefix", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));

    await expect(
      caller.submit({
        body: "look at this",
        imagePath: "someone-else/screenshot.png",
        payload: payload(),
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("own prefix"),
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should accept an image path under the caller's own prefix", async () => {
    authed(db);
    const user = freshUser();
    const caller = feedbackRouter.createCaller(buildCtx(db, user));

    await caller.submit({
      body: "look at this",
      imagePath: `${user.id}/shot.png`,
      payload: payload(),
    });

    expect(insertedRow(db)).toMatchObject({ imagePath: `${user.id}/shot.png` });
  });

  // "Is this real usage or a seeded run" decides whether a report is evidence.
  // A client-asserted answer is worth nothing, so the server's stamp has to win
  // even when the caller supplies one.
  it("should stamp environment and aiMock server-side, overriding the client", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));

    await caller.submit({
      body: "report",
      payload: {
        ...payload(),
        environment: "production",
        aiMock: false,
      } as ClientPayload,
    });

    const stored = insertedRow(db).payload as Record<string, unknown>;
    expect(stored.environment).toBe("development");
    expect(stored.aiMock).toBe(false);
    // The client's own fields survive alongside the stamp.
    expect(stored.route).toBe("/groceries");
  });

  it("should drop oversized debugPanels but keep the report itself", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));

    await caller.submit({
      body: "the report that must survive",
      payload: payload({ debugPanels: { huge: "x".repeat(150_000) } }),
    });

    const row = insertedRow(db);
    const stored = row.payload as Record<string, unknown>;
    expect(row.body).toBe("the report that must survive");
    expect(stored.debugPanels).toMatchObject({
      __truncated: expect.stringContaining("debugPanels dropped"),
    });
    // Everything else is untouched — only the unbounded field is dropped.
    expect(stored.route).toBe("/groceries");
    expect(stored.replayUrl).toBe("https://us.posthog.com/replay/session-1");
  });

  it("should rate-limit a runaway caller without implying the report was lost", async () => {
    authed(db);
    const caller = feedbackRouter.createCaller(buildCtx(db, freshUser()));

    for (let i = 0; i < FEEDBACK_RATE_LIMIT.limit; i += 1) {
      await caller.submit({ body: `report ${i}`, payload: payload() });
    }

    await expect(
      caller.submit({ body: "one too many", payload: payload() })
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("nothing was lost"),
    });
  });
});

// ⚠️ THE GUARD FOR BUG-060'S CLASS ARRIVING THROUGH A NEW DOOR.
//
// The ring buffer is the one field in the payload that a future edit could
// widen into a content channel: "just log the input too, it would help
// debugging" is a reasonable-sounding change that would put the grocery list,
// the week's meal titles and the user's dietary constraints into this table.
// That is exactly how templated `aria-label`s put them into session replay.
// The schema has no field that can hold them, and this asserts it stays that
// way — a constraint by construction rather than by instruction.
describe("the tRPC ring buffer cannot carry household content", () => {
  it("should reject a call entry carrying inputs or outputs", async () => {
    const { trpcCallSchema } = await import("@/lib/feedback/payload");

    const withInput = trpcCallSchema.safeParse({
      path: "grocery.addItem",
      type: "mutation",
      ok: true,
      durationMs: 12,
      msBeforeCapture: 900,
      input: { name: "Garlic" },
      result: { id: "1", name: "Garlic" },
    });

    expect(withInput.success).toBe(true);
    // Zod strips unknown keys, so the assertion that matters is that the parsed
    // value cannot carry them — not that the parse failed.
    expect(withInput.success && withInput.data).not.toHaveProperty("input");
    expect(withInput.success && withInput.data).not.toHaveProperty("result");
    expect(Object.keys(withInput.success ? withInput.data : {})).toEqual([
      "path",
      "type",
      "ok",
      "durationMs",
      "msBeforeCapture",
    ]);
  });
});
