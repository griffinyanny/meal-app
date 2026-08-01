"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

/**
 * The scrollable region of a sheet.
 *
 * `DrawerContent` is a flex column capped at 80vh, so without this a long day —
 * or a long rationale on a small phone — clips instead of scrolling. `min-h-0`
 * is the part that is easy to miss: a flex child defaults to `min-height:auto`
 * and refuses to shrink below its content, which makes `overflow-y-auto` inert.
 */
export function SheetBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-2">{children}</div>
  );
}

/**
 * The shell both Plan sheets are built from.
 *
 * ONE ACTION MODEL, TWO KINDS OF ACTION (wave 1, state 5 — settled): **chips
 * ask the chef for a change; rows go somewhere else.** That is the rule, and it
 * is why they look different — not their position on the screen. Every control
 * in either sheet is one or the other, and nothing is split top-and-bottom.
 *
 * The meal sheet and the day sheet differ only in their first line and their
 * primary (ledger §D, `1l`), which is why the pieces live here rather than
 * inside either one.
 */

/**
 * Who is speaking and about what: eyebrow, title, meta, then the chef's line.
 *
 * The rationale sits at FEATURE size (§W7) because in a sheet it is the main
 * event — on the rail it argues for a placement you are scanning past, here it
 * is the answer to the question that made you tap.
 */
export function SheetIdentity({
  eyebrow,
  title,
  meta,
  rationale,
}: {
  eyebrow: string;
  title: string;
  meta?: string | null;
  rationale?: string | null;
}) {
  return (
    // pr-12 clears the Close control, which is positioned top-right by CSS
    // rather than by DOM order (see ui/drawer.tsx).
    <div className="px-4 pb-5 pt-1 pr-12">
      <div className="mb-1.5 flex items-baseline justify-between gap-2.5">
        <p className="m-0 spec-eyebrow">
          {eyebrow}
        </p>
        {meta ? (
          <span className="text-[11.5px] text-[var(--spec-text-caption)]">
            {meta}
          </span>
        ) : null}
      </div>
      <DrawerTitle className="m-0 text-[22px] font-[650] leading-[1.28] tracking-[-0.3px] text-[var(--spec-text-feature)]">
        {title}
      </DrawerTitle>
      {/* The chef's line doubles as the sheet's accessible description — it is
          literally what this sheet is about, so a separate one would be a
          second, worse sentence written only for screen readers. */}
      {rationale ? (
        <DrawerDescription
          className="m-0 mt-2.5 text-[15px] italic leading-[1.45] text-[var(--spec-gold-voice)]"
          style={{ textWrap: "pretty" }}
        >
          {rationale}
        </DrawerDescription>
      ) : null}
    </div>
  );
}

/** A titled group. The label is the only thing that says what its rows are for. */
export function SheetGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="px-4 pb-5">
      <p className="m-0 mb-2.5 spec-eyebrow">
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** A chip: it ASKS THE CHEF for a change. Never navigates. */
export function SheetChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="spec-inset rounded-[18px] px-[14px] py-3 text-left text-[14.5px] text-[var(--spec-text-body)] transition-opacity active:opacity-70 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

/** A row: it GOES SOMEWHERE. Never asks the chef for anything. */
export function SheetRow({
  label,
  sublabel,
  onClick,
  href,
  disabled,
}: {
  label: string;
  sublabel?: string | null;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium leading-[1.3] text-[var(--spec-text-primary)]">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-0.5 block text-[12px] text-[var(--spec-text-caption)]">
            {sublabel}
          </span>
        ) : null}
      </span>
      {disabled ? null : (
        <ChevronRight
          aria-hidden
          className="size-4 flex-none stroke-[var(--spec-text-muted)]"
          strokeWidth={2.1}
        />
      )}
    </>
  );

  const className = cn(
    "spec-inset flex min-h-[56px] w-full items-center gap-3 rounded-[18px] px-[14px] py-3 text-left",
    disabled && "opacity-60"
  );

  // A row that cannot go anywhere yet is not a disabled link — it is a
  // statement of fact with no affordance at all, because a greyed chevron
  // invites the tap it is about to refuse.
  if (disabled || (!href && !onClick)) {
    return <div className={className}>{body}</div>;
  }

  if (href) {
    return (
      <a className={className} href={href}>
        {body}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

/**
 * THE LIBRARY DOOR (ledger §A, W8) — the quiet way into the picker.
 *
 * A 62px L2 row, unconditional: it works with an empty library, because the
 * picker's empty state is a door of its own rather than a dead end. Lives here
 * because §A says it is "droppable verbatim into the day sheet and the meal
 * sheet" as well as the intent screen, and three copies of a load-bearing string
 * is how the three drift apart.
 */
export function LibraryDoor({
  onClick,
  sublabel = "I'll build the week around it",
}: {
  onClick: () => void;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="library-door"
      className="spec-inset flex min-h-[62px] w-full items-center gap-3 rounded-[18px] px-[14px] py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium leading-[1.3] text-[var(--spec-text-primary)]">
          Cook something I&apos;ve saved
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--spec-text-caption)]">
          {sublabel}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 flex-none stroke-[var(--spec-text-muted)]"
        strokeWidth={2.1}
      />
    </button>
  );
}

/**
 * The sheet's own working/failed line.
 *
 * PENDING STAYS IN THE OPEN SHEET (the sheet closes on success, not on tap) so
 * the action never feels like it did nothing. On failure the sheet stays put
 * with the message — and since W3 the same failure also reaches the action
 * bar's slot, so walking away from the sheet no longer loses it.
 */
export function SheetStatus({
  working,
  error,
}: {
  working?: string | null;
  error?: string | null;
}) {
  if (working) {
    return (
      <div className="px-4 pb-6" aria-live="polite">
        <p className="m-0 text-[13.5px] italic text-[var(--spec-gold-voice)]">
          {working}
        </p>
        <div className="shimmer-bar mt-2 h-0.5 w-full rounded-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 pb-6">
        <p
          className="m-0 text-[13.5px] text-[var(--spec-destructive-text)]"
          role="alert"
        >
          {error}
        </p>
      </div>
    );
  }
  return null;
}
