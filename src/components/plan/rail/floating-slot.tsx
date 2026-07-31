"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChefPresence } from "@/components/shared/chef-presence";

// EXACTLY ONE FLOATING LAYER ABOVE THE TAB BAR (ledger §D), owned by the
// screen's contextual primary. The toast BORROWS this slot rather than adding
// one, which is why all three variants below share the same box:
//
//     bottom 96 · height 52 · radius 16 · insets 16
//
// A confirmed week renders none of them. The decision was spent, and an empty
// bottom edge is the strongest possible signal that nothing is being asked of
// you — that absence is the state, not a missing feature.

// FIXED, not absolute. The frame's "bottom 96" is a distance from the screen's
// edge, and on a phone canvas those are the same thing — but in the app the
// scroll container is the document, so an absolutely-positioned slot anchors to
// the bottom of the CONTENT and scrolls away. A floating layer you have to
// scroll to find is not floating. `fixed` positions against the viewport, which
// costs the column its centring, so the slot borrows the tab bar's trick.
const SLOT =
  "fixed inset-x-0 bottom-24 z-[38] mx-auto w-full max-w-[430px] px-4";

// What the surfaces below owe the slot in scroll padding (§D). A draft has to
// clear the 52px primary AND the consequence line above it; a confirmed week
// has no floating action at all, which is why the number drops.
export const SLOT_PADDING_DRAFT = "pb-[168px]";
export const SLOT_PADDING_BARE = "pb-[108px]";

/**
 * What is in the slot right now, when it isn't the primary.
 *
 * One value, not three independently-rendered pills — the slot has exactly one
 * occupant and the rule is structural, so it is expressed as a type rather than
 * as a z-index race between an ack, an error and a working label.
 */
export interface SlotToast {
  message: string;
  tone?: "chef" | "error";
  action?: { label: string; onClick: () => void };
}

/** The decision, with its consequence stated above it (draft only). */
export function PrimarySlot({
  label,
  consequence,
  onClick,
  inert,
}: {
  label: string;
  consequence: string;
  onClick: () => void;
  /** Confirm goes inert while the chef is working — never gone, never a spinner. */
  inert?: boolean;
}) {
  return (
    <div className={SLOT}>
      <p className="m-0 mb-[9px] text-center text-[12px] text-[var(--spec-text-caption)]">
        {consequence}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={inert}
        className={cn(
          "flex h-[52px] w-full items-center justify-center gap-[9px] rounded-2xl bg-[var(--spec-action)] text-[15.5px] font-[650] text-[var(--spec-action-on)] shadow-[0_10px_28px_-12px_rgba(244,235,220,0.3)] transition-opacity",
          inert && "opacity-40"
        )}
      >
        {label}
        <ArrowRight aria-hidden className="size-[17px]" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/**
 * Generation's readout. A COUNT, NEVER A BAR (§C) — a bar would claim a
 * precision the model does not have, and "14 of 15" is the actual state: the
 * week is essentially done and one thing is outstanding.
 *
 * There is no control here because there is nothing to confirm yet.
 */
export function CountSlot({ written, total }: { written: number; total: number }) {
  return (
    <div className={SLOT}>
      <p
        className="m-0 text-center text-[13px] text-[var(--spec-text-caption)]"
        aria-live="polite"
      >
        {written} of {total} written
      </p>
    </div>
  );
}

/**
 * The same readout BEFORE there is anything to count (BUG-035).
 *
 * `CountSlot` has nothing to say until the first meal lands, which used to mean
 * the screen was identical at second 2 and second 80. It borrows the count's
 * exact box and register so a slow start resolving into "1 of 7 written" reads
 * as one line updating, not as a warning being replaced by progress.
 */
export function WaitingSlot({ message }: { message: string }) {
  return (
    <div className={SLOT}>
      <p
        data-testid="plan-waiting"
        className="m-0 text-center text-[13px] text-[var(--spec-text-caption)]"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}

/**
 * The bar BECOMING the message (§C).
 *
 * It inherits the primary's exact box so the transition is one object changing
 * its fill and contents, not two objects trading places through the same air.
 * It never coexists with the bar. It exists because a compact row has no space
 * for the chef's sentence — at three-meal density the row carries title and
 * meta only, so the sentence has to live somewhere, and this is where.
 *
 * The 16px radius is a deliberate departure from the 14px toast rung: the rung
 * follows the SLOT it occupies, and this slot is the 52px primary's.
 */
export function ToastSlot({ message, tone = "chef", action }: SlotToast) {
  const isError = tone === "error";
  return (
    <div className={SLOT}>
      <div
        data-testid="plan-toast"
        data-tone={tone}
        className="spec-floating flex h-[52px] items-center gap-[11px] rounded-2xl px-4"
        role={isError ? "alert" : "status"}
        aria-live="polite"
      >
        {isError ? null : <ChefPresence size="toast" />}
        <p
          className={cn(
            "m-0 min-w-0 flex-1 truncate text-[13.5px] leading-[1.35]",
            isError
              ? "text-[var(--spec-destructive-text)]"
              : "italic text-[var(--spec-gold-voice)]"
          )}
        >
          {message}
        </p>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="flex-none text-[13px] font-semibold text-[var(--spec-action)]"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
