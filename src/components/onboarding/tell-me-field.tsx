"use client";

import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TellMeFieldProps {
  example: string;
  onSubmit: (text: string) => void;
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

  function submit() {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <div
      className={cn(
        "mt-3.5 flex items-center gap-2.5 rounded-[14px] border bg-[rgba(26,24,22,0.5)] px-3 py-2 transition-colors",
        text.trim() ? "border-[rgba(232,148,74,0.45)]" : "border-white/[0.09]"
      )}
    >
      <button
        type="button"
        onClick={onMicTap}
        disabled={disabled}
        aria-label="Answer by voice"
        className="flex size-9 flex-none items-center justify-center rounded-full bg-[rgba(232,148,74,0.16)] text-[#F2B279] transition-colors hover:bg-[rgba(232,148,74,0.24)] disabled:opacity-50"
      >
        <Mic className="size-4" strokeWidth={2} />
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
        className="min-w-0 flex-1 bg-transparent text-[0.9rem] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
      />

      {isSubmitting ? (
        <span className="flex-none pr-1 text-[11px] font-semibold tracking-[0.5px] text-[#F2B279]">
          CATCHING…
        </span>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send to chef"
          data-testid="onboarding-tell-me-send"
          className="flex size-8 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-4" strokeWidth={2.2} />
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
      className="animate-turn-in mt-3.5 rounded-[16px] border border-[rgba(232,148,74,0.26)] bg-[rgba(232,148,74,0.08)] px-[15px] py-[13px]"
    >
      <p className="m-0 mb-2.5 text-[10.5px] font-semibold tracking-[1.2px] text-[#F2B279]">
        WHAT I CAUGHT
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center rounded-[10px] border border-[rgba(232,148,74,0.34)] bg-[rgba(232,148,74,0.14)] px-2.5 py-1.5 text-[13px] font-semibold text-[#E8DFD3]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
