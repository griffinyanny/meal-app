"use client";

import { useState } from "react";
import { FreeformField } from "@/components/shared/freeform-field";
import { LibraryDoor } from "./sheet/sheet-parts";

export interface NoPlanStateProps {
  onGenerate: (request?: string) => void;
  isGenerating: boolean;
  // Present when re-prompting over an existing plan (vs. the first-run empty
  // state). `onCancel` returns to the current plan; `replaceWarning` tells the
  // user generating will replace a confirmed week.
  onCancel?: () => void;
  replaceWarning?: boolean;
  // Arriving straight from the onboarding interview (Phase 1E #4). This IS the
  // hand-off surface — the interview deliberately ends in the real intent
  // screen, pre-filled, rather than a bespoke onboarding step that would fork
  // the app into two ways of starting a week.
  seed?: {
    request?: string;
    chips: string[];
  };
  // W8 · the library door and what is already behind it. `picks` are the titles
  // the person has chosen so far; they are shown because a choice you cannot see
  // is a choice you cannot change.
  onOpenPicker?: () => void;
  picks?: { id: string; title: string }[];
  onRemovePick?: (id: string) => void;
  // §B: "picks survive a regenerate by default, AND THE GUARANTEE IS STATED
  // BEFORE THE ASK." Set when re-prompting over a week that already carries
  // picks — the person is about to press a button that replaces the week, and
  // this is the sentence that tells them what it does not replace.
  carriedPickCount?: number;
}

const SUGGESTIONS = [
  "Healthy weeknight dinners",
  "I want to grill",
  "Kid-friendly meals",
  "Use what's in my fridge",
  "Dinner party Saturday",
];

export function NoPlanState({
  onGenerate,
  isGenerating,
  onCancel,
  replaceWarning,
  seed,
  onOpenPicker,
  picks = [],
  onRemovePick,
  carriedPickCount = 0,
}: NoPlanStateProps) {
  const [text, setText] = useState(seed?.request ?? "");
  const canSubmit = text.trim().length > 0 && !isGenerating;

  return (
    <div className="space-y-6 py-2">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isGenerating}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          ← Keep current plan
        </button>
      )}

      {seed && (
        <p className="spec-eyebrow">
          YOUR PLAN, PRE-FILLED FROM WHAT YOU TOLD ME
        </p>
      )}

      <div className="space-y-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {seed ? "Here's what I'll cook around." : "What are you thinking this week?"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {seed
            ? "Change anything, or let me get started."
            : "Tell me what you're in the mood for, or I'll figure it out."}
        </p>
      </div>

      {/* The visible proof that the interview fed the plan — these are the
          constraints just captured, shown before a single meal is generated. */}
      {seed && seed.chips.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="plan-seed-chips">
          {seed.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.8rem] font-medium text-foreground/90"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {replaceWarning && (
        <p className="text-xs text-muted-foreground">
          Generating a new plan will replace this week&apos;s meals.
        </p>
      )}

      {/* Generic starters would compete with the seed chips right above them
          and invite the user to discard what they just told the chef. */}
      {!seed && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onGenerate(s)}
              disabled={isGenerating}
              className="rounded-full border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.05)] px-3.5 py-2 text-sm text-foreground/90 transition-colors hover:bg-[rgba(240,222,190,0.1)] disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Spec §09's one control. The suggestion chips above are shortcuts INTO
          this field, which is what §09 says they are — not a second input.
          ⚠️ Submit moved from Cmd/Ctrl+Enter to plain Enter (Shift+Enter for a
          newline), matching the chef sheet and onboarding: this app is used on
          a phone, where there is no Cmd key and Enter is the only key there
          is. */}
      <FreeformField
        value={text}
        onChange={setText}
        onSubmit={() => {
          if (canSubmit) onGenerate(text.trim());
        }}
        placeholder="Or just start talking. What sounds good?"
        inputAriaLabel="Tell the chef what you want this week"
        disabled={isGenerating}
        inputTestId="plan-intent-input"
        sendTestId="plan-intent-send"
      />

      {/* What is already chosen. Shown ABOVE the door rather than inside it,
          because a door that changes its own label as you use it stops reading
          as a door. Each one is removable: choosing is only a real act if
          un-choosing is too. */}
      {picks.length > 0 && (
        <div className="space-y-2" data-testid="plan-picks">
          <p className="m-0 spec-eyebrow">
            YOU&apos;RE COOKING
          </p>
          {picks.map((pick) => (
            <div
              key={pick.id}
              data-testid="plan-pick"
              className="spec-inset flex min-h-[52px] items-center gap-3 rounded-[14px] px-[14px] py-3"
            >
              <span className="min-w-0 flex-1 text-[14.5px] font-medium text-[var(--spec-text-primary)]">
                {pick.title}
              </span>
              {onRemovePick && (
                <button
                  type="button"
                  onClick={() => onRemovePick(pick.id)}
                  aria-label={`Remove ${pick.title}`}
                  className="flex-none text-[12px] text-[var(--spec-text-caption)] underline underline-offset-2"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* THE LIBRARY DOOR — a 62px L2 row, the last object before the fold (§A).
          Unconditional: it works with an empty library, because the picker's
          empty state is itself a door rather than a dead end. */}
      {onOpenPicker && (
        <LibraryDoor
          onClick={onOpenPicker}
          sublabel={
            picks.length > 0
              ? "Add another, or let the chef fill the rest"
              : "I'll build the week around it"
          }
        />
      )}

      {/* §B's guarantee, STATED BEFORE THE ASK — the button below replaces the
          week, and this is the one sentence that says what it does not replace. */}
      {carriedPickCount > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="picks-survive-note">
          {carriedPickCount === 1
            ? "Your pick stays — I'll build the new week around it."
            : `Your ${carriedPickCount} picks stay — I'll build the new week around them.`}
        </p>
      )}

      {/* ⚠️ The seeded branch used to render a full-width `Build my first week`
          here, and the §09 field above it has a filled cream send — two filled
          cream buttons in one viewport, on the front door of the north-star
          flow. §08: "one filled cream button per viewport; if two actions both
          feel primary, one of them is not." Third session running for this law
          (S55's filter chip, S56's organize toggle) and the first time it was
          two actual buttons.

          Deleted rather than softened, on Griffin's call (S57), and the reason
          is that they were never two competing primaries. The field arrives
          PRE-FILLED with the seed request, so `send` and `Build my first week`
          fired the same call with the same argument — one action drawn twice.
          Softening one copy leaves the duplication and just makes the labelled
          half quieter than the library door above it. This is B7's precedent
          exactly: it deleted the generate and modify dialogs' full-width
          commits for being redundant with the send rather than demoting them.

          The link below is now unconditional, which is what makes the deletion
          safe: it is the no-typing path in both states, and on the seeded
          screen it is also the escape hatch for "ignore what I typed". */}
      <button
        type="button"
        onClick={() => onGenerate(undefined)}
        disabled={isGenerating}
        data-testid="plan-chef-decides"
        className="text-sm text-primary/90 transition-colors hover:text-primary disabled:opacity-60"
      >
        Or let your chef figure it out →
      </button>
    </div>
  );
}
