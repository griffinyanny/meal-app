"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FreeformFieldProps {
  value: string;
  onChange: (value: string) => void;
  // Called on Enter or on the send tap. The caller owns the draft, because the
  // three surfaces disagree about what happens after: onboarding clears only on
  // success, the chef sheet never clears, Groceries clears immediately.
  onSubmit: () => void;
  placeholder: string;
  inputAriaLabel: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  // Replaces the send button while submitting (onboarding's "CATCHING…"). When
  // unset the send button simply goes disabled.
  submittingLabel?: string;
  // The mic's "not yet". Optional: without it the field says so inline, which
  // is what lets this control drop onto a surface that has no toast channel.
  onMicTap?: () => void;
  autoFocus?: boolean;
  inputTestId?: string;
  sendTestId?: string;
  className?: string;
}

// R1 is TEXT ONLY (Griffin, S35 — STT is out of scope). The mic is drawn
// because spec §09 admits no text-only version of this control, and tapping it
// says so plainly rather than failing silently or pretending to listen.
export const MIC_NOT_YET = "Voice is coming soon. For now, type it and I'll catch it.";

// Three lines of 14.5px/1.4 type, then it scrolls (spec §09 anatomy).
const MAX_HEIGHT = 62;

/**
 * Spec §09 — the one way to talk to the chef.
 *
 * "Speak or type, always both, always in the same control." The build had four
 * answers to that (a mic row in onboarding, a text sheet in You, a bare input
 * with a round send in Groceries, a textarea in the chef sheet); this is the
 * one. Search is deliberately NOT this control — §09 says so in as many words,
 * and search stays in header pattern B.
 *
 * ⚠️ The mic and send are 44px, not the 40 the §09 anatomy draws. §12 item 05
 * sets a 44px floor for icon-only controls and calls the failure it fixes "a
 * real tap failure, not a style nit"; §11 bands icon buttons at 40–46, so 44 is
 * inside the spec's own band. A floor beats a drawing, and the container grows
 * to 56 to carry it (44 + the 6px padding §09 states).
 */
export function FreeformField({
  value,
  onChange,
  onSubmit,
  placeholder,
  inputAriaLabel,
  disabled,
  isSubmitting,
  submittingLabel,
  onMicTap,
  autoFocus,
  inputTestId,
  sendTestId,
  className,
}: FreeformFieldProps) {
  const [showMicNotice, setShowMicNotice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !isSubmitting && !disabled;

  // Grow to three lines, then scroll. Measured from the element rather than
  // `field-sizing: content`, which iOS Safari does not support — and iOS Safari
  // is the platform this app is actually used on.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  function handleMic() {
    if (onMicTap) {
      onMicTap();
      return;
    }
    setShowMicNotice(true);
  }

  return (
    <div className={className}>
      {/* §09 anatomy: an L3 control at r16, padded 6 all round with 16 on the
          leading edge. No focus ring on purpose — the caret and the brighter
          value text ARE the focus state, and a gold ring here would read as the
          chef typing rather than the user. */}
      <div
        className={cn(
          "spec-control flex min-h-[56px] items-center gap-2.5 rounded-[16px] p-1.5 pl-4 transition-colors",
          value.trim() && "border-[rgba(240,222,190,0.32)]"
        )}
      >
        {/* Cream because it is an action, not gold: gold is the chef, and this
            control belongs to the user's hand (law 02). Never mic-only and
            never text-only — both affordances stay visible at rest, so nobody
            has to notice which mode they are in. */}
        <button
          type="button"
          onClick={handleMic}
          disabled={disabled}
          aria-label="Answer by voice"
          data-testid="freeform-mic"
          className="flex size-11 flex-none items-center justify-center rounded-[12px] border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.06)] text-[var(--spec-action)] transition-colors hover:bg-[rgba(240,222,190,0.12)] disabled:opacity-50"
        >
          <Mic className="size-[19px]" strokeWidth={2} />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => {
            if (showMicNotice) setShowMicNotice(false);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            // Enter submits; Shift+Enter inserts a newline. Ignore Enter while
            // an IME composition is active (don't submit mid-compose).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={isSubmitting || disabled}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          autoFocus={autoFocus}
          data-testid={inputTestId}
          className="min-w-0 flex-1 resize-none bg-transparent py-1 text-[14.5px] leading-[1.4] text-[var(--spec-text-primary)] caret-[var(--spec-action)] placeholder:text-[var(--spec-text-muted)] focus:outline-none disabled:opacity-60"
        />

        {isSubmitting && submittingLabel ? (
          <span className="flex-none pr-2 spec-label text-[var(--spec-text-muted)]">
            {submittingLabel}
          </span>
        ) : (
          /* Send appears beside the mic rather than replacing it — starting to
             type must never close the other door (spec §09). */
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Send to chef"
            data-testid={sendTestId}
            className="flex size-11 flex-none items-center justify-center rounded-[12px] bg-[var(--spec-action)] text-[var(--spec-action-on)] transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="size-[19px]" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* §09 draws a line beneath the field for the mic's own state ("Listening
          — tap the mic to stop"), so the honest "not yet" lives in that slot
          rather than in a toast the surface may not have. */}
      {showMicNotice && (
        <p
          aria-live="polite"
          data-testid="freeform-mic-notice"
          className="mx-0.5 mt-2.5 spec-meta text-[var(--spec-text-muted)]"
        >
          {MIC_NOT_YET}
        </p>
      )}
    </div>
  );
}
