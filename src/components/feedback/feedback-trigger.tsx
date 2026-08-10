"use client";

import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { captureClientPayload } from "@/lib/feedback/capture";
import type { ClientPayload } from "@/lib/feedback/payload";
import { FeedbackSheet } from "./feedback-sheet";

/**
 * The one control (1F/E, E0 call 1).
 *
 * Griffin is on the couch with his phone, hits something wrong, and taps this.
 *
 * ⚠️ IT IS NOT THE DEBUG HUD'S 🐛, AND THE REASON IS THE FINDING THAT REOPENED
 * E0's FIRST QUESTION. `scope-1F.md` scoped this as "reuse the HUD's corner
 * control, behind DEV_TOOLS_EMAILS. Both R1 users hold that flag, so the seam
 * costs nothing." That merged two different flags. `hudEnabled()` is
 * `NODE_ENV=development` OR `NEXT_PUBLIC_DEBUG_HUD=1` at build OR a
 * `localStorage` key — and `NEXT_PUBLIC_DEBUG_HUD` is NOT set in Vercel
 * Production (measured). So on prod the 🐛 needs a browser console; an installed
 * iOS PWA has none, and its storage is isolated from Safari's (S59's cookie-jar
 * boundary). **A feature premised on "one control, no laptop" had been scoped
 * onto a control that requires a laptop to turn on.**
 *
 * `DEV_TOOLS_EMAILS` is the flag that is actually in Vercel Production, is
 * checked SERVER-side, and that both R1 users will hold. The client is told
 * whether it may render this, and is never trusted about it.
 *
 * ⚠️ THE GATE ARRIVES AS A PROP FROM THE `(app)` LAYOUT, NOT AS A tRPC QUERY.
 * `httpBatchLink` batches a query fired during mount with the page's OWN
 * primary query, so a `devToolsEnabled` query made every page's first load wait
 * on dev chrome. The layout already holds a cryptographically verified email,
 * so the answer costs no request at all. **Dev chrome must never compete with
 * the app's first load.**
 *
 * ⚠️ HONEST CORRECTION, because the first version of this comment claimed more:
 * removing the query was NOT what fixed the `plan-intent` a11y failure. That
 * failure was a **pre-existing flake** — BUG-058's intent-screen remount, which
 * the a11y spec could scan inside of — measured at roughly 1 run in 3 with this
 * component removed entirely. Workstream E raised it to 3 in 3 by adding work
 * to the same load; it did not create it. **The fix is in the spec** (it now
 * settles on `networkidle` before grading). The prop is still right, on its own
 * merits, and it is not a bug fix. A first A/B at three samples read an
 * amplified flake as a regression — S65's own warning, walked into while
 * quoting it.
 *
 * Two smaller reasons not to overload the 🐛: it sits at `left-2 top-2`, under
 * the status bar in standalone mode; and a state-dump toggle and a capture sheet
 * are different actions, so one button means a mode.
 *
 * ⚠️ GRADUATION (V1.5): when real users arrive this moves and the gate changes.
 * Nothing below the surface assumes a developer caller — the table, the mutation
 * and the payload are all user-scoped — so graduating is moving this component
 * and swapping the gate, not a rebuild.
 */
export function FeedbackTrigger() {
  const [open, setOpen] = useState(false);
  // ⚠️ SNAPSHOT AT OPEN, NOT AT SUBMIT. Opening a sheet can itself change what
  // is on screen, and the report may be typed a minute later — by then the route
  // can have changed, a query can have refetched, and the tRPC ring buffer will
  // have filled with calls the sheet itself made. The payload has to describe
  // the moment he decided something was wrong.
  const [payload, setPayload] = useState<ClientPayload | null>(null);
  // The sheet is not mounted until first opened. A drawer nobody has opened has
  // no business being in the tree, and it keeps vaul off every page load.
  //
  // ⚠️ This was originally written up as the FIX for the `plan-intent` a11y
  // failure, on an A/B that looked clean (button + sheet → 3/3 red, button alone
  // → 2/2 green). It was not: that failure is a pre-existing flake and the
  // sample was too small to separate the two. Kept because it is the right
  // shape, not because it fixed anything. `mounted` stays true afterwards so the
  // close animation still has something to animate.
  const [mounted, setMounted] = useState(false);


  function openSheet() {
    setPayload(captureClientPayload());
    setMounted(true);
    setOpen(true);
  }

  return (
    <>
      {/* ⚠️ NOT FLOATING — it sits in the tab bar's own row. A `fixed` overlay
          landed on Plan's action slot and intercepted the toast's Retry (X1).
          `flex-none` so the four real tabs keep `flex-1`; `min-h-[44px]` is
          §12 item 05's floor, the same one the tabs carry. */}
      <button
        type="button"
        onClick={openSheet}
        data-testid="feedback-trigger"
        className="flex flex-none flex-col items-center justify-center gap-0.5 min-h-[44px] w-11 rounded-[12px] text-[var(--spec-text-muted)] transition-colors hover:text-[var(--spec-text-primary)]"
      >
        <MessageSquareWarning className="size-6" strokeWidth={1.5} />
        <span className="sr-only">Report a problem</span>
      </button>

      {mounted && (
        <FeedbackSheet open={open} onOpenChange={setOpen} payload={payload} />
      )}
    </>
  );
}
