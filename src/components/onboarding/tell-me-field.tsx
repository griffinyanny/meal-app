"use client";

import { useState } from "react";
import { FreeformField } from "@/components/shared/freeform-field";

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
// The control itself is `shared/freeform-field.tsx` (spec §09). This wrapper
// owns only what is specific to the interview: the draft, the clear-on-success
// rule, and the flow's own toast for the mic's "not yet" — onboarding has a
// toast channel and a graded capture state for that message, so it keeps them.
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
    <FreeformField
      className="mt-3.5"
      value={text}
      onChange={setText}
      onSubmit={submit}
      placeholder={example}
      inputAriaLabel="Tell the chef in your own words"
      disabled={disabled}
      isSubmitting={isSubmitting}
      submittingLabel="CATCHING…"
      onMicTap={onMicTap}
      inputTestId="onboarding-tell-me-input"
      sendTestId="onboarding-tell-me-send"
    />
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
            // Neutral inset, not a gold pill. The TRAY is gold-soft and stays
            // that way — it is the chef saying "here's what I caught" — but
            // each chip inside it is a value the user supplied, and gold marks
            // the chef speaking rather than the content it heard.
            className="inline-flex items-center rounded-[12px] border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.07)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--spec-text-primary)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
