"use client";

import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TellMeFieldProps {
  example: string;
  // Resolves true when the chef actually caught it. The field keeps the text
  // until then — see submit().
  onSubmit: (text: string) => Promise<boolean>;
  onMicTap: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

// The quiet "or just tell me" at the bottom of every question turn — the second
// half of the locked one-model-per-screen layout (tappable answers on top, this
// underneath). It is NOT a chat bar: no thread, no history, no persistence
// across turns. Whatever is typed here routes through the existing user.talk
// capture path, the same machinery the You tab uses.
//
// R1 is TEXT ONLY. The mic icon is kept because it's the affordance the design
// locked and because dictation is coming, but it is deliberately not wired —
// tapping it says so plainly rather than failing silently or pretending to
// listen (Griffin, S35; STT is out of R1 scope).
export function TellMeField({
  example,
  onSubmit,
  onMicTap,
  isSubmitting,
  disabled,
}: TellMeFieldProps) {
  const [text, setText] = useState("");
  const canSubmit = text.trim().length > 0 && !isSubmitting && !disabled;

  // Clear on success ONLY. The failure toast invites you to try again, so the
  // message has to still be there to try again with — retyping on a phone, on
  // the first screen a user ever sees, is the worst place to lose input. Same
  // reasoning as shared/talk-to-chef-sheet.tsx, which never clears on submit.
  async function submit() {
    if (!canSubmit) return;
    const caught = await onSubmit(text.trim());
    if (caught) setText("");
  }

  return (
    // Spec §09 anatomy: an L3 control at min-height 52 and r16, padded 6 all
    // round with 16 on the leading edge. There is no focus ring on purpose —
    // the caret and the brighter value text ARE the focus state, and a gold ring
    // here would read as the chef typing rather than the user.
    <div
      className={cn(
        "spec-control mt-3.5 flex min-h-[52px] items-center gap-2.5 rounded-[16px] py-1.5 pl-4 pr-1.5 transition-colors",
        text.trim() && "border-[rgba(240,222,190,0.32)]"
      )}
    >
      {/* The mic is cream because it is an action, not gold: gold is the chef,
          and this control belongs to the user's hand (law 02). Never mic-only
          and never text-only — both affordances stay visible at rest, so nobody
          has to notice which mode they are in. */}
      <button
        type="button"
        onClick={onMicTap}
        disabled={disabled}
        aria-label="Answer by voice"
        className="flex size-10 flex-none items-center justify-center rounded-[12px] border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.06)] text-[var(--spec-action)] transition-colors hover:bg-[rgba(240,222,190,0.12)] disabled:opacity-50"
      >
        <Mic className="size-[19px]" strokeWidth={2} />
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        disabled={isSubmitting || disabled}
        placeholder={example}
        aria-label="Tell the chef in your own words"
        data-testid="onboarding-tell-me-input"
        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[var(--spec-text-primary)] caret-[var(--spec-action)] placeholder:text-[var(--spec-text-muted)] focus:outline-none disabled:opacity-60"
      />

      {isSubmitting ? (
        <span className="flex-none pr-2 text-[11px] font-semibold tracking-[0.5px] text-[var(--spec-text-muted)]">
          CATCHING…
        </span>
      ) : (
        /* Send appears beside the mic rather than replacing it — starting to
           type must never close the other door (spec §09). */
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send to chef"
          data-testid="onboarding-tell-me-send"
          className="flex size-10 flex-none items-center justify-center rounded-[12px] bg-[var(--spec-action)] text-[var(--spec-action-on)] transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-[19px]" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

export interface CaughtTrayProps {
  items: string[];
}

// "What I caught" — shown only after free text lands, and only for what the
// user's own words surfaced. The locked design is explicit that this must not
// restate what the pills already cover, so the caller passes only the extras.
export function CaughtTray({ items }: CaughtTrayProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-testid="onboarding-caught-tray"
      className="animate-turn-in mt-3.5 rounded-[16px] border border-[rgba(233,179,72,0.26)] bg-[rgba(233,179,72,0.08)] px-[15px] py-[13px]"
    >
      <p className="m-0 mb-2.5 text-[10.5px] font-semibold tracking-[1.2px] text-[var(--spec-gold-tint)]">
        WHAT I CAUGHT
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center rounded-[10px] border border-[rgba(233,179,72,0.34)] bg-[rgba(233,179,72,0.14)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--spec-text-body)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
