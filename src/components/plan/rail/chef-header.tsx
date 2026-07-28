"use client";

import { cn } from "@/lib/utils";
import { ChefPresence } from "@/components/shared/chef-presence";

export interface ChefHeaderProps {
  /** Right-hand status: "Draft · Jul 26", "Set · Jul 26", "Writing · 14 of 15". */
  status: string;
  /** The claim. Plain feature type — you read it, so it is never gold (law 03). */
  summary: string | null;
  /** The chef speaking. Italic gold is the one body-sized accent the spec grants. */
  rationale?: string | null;
  /** The revise door. Chrome, high in the header — never a floating object. */
  onRevise?: () => void;
  reviseLabel?: string;
  /** Runs the fast thinking ember while the chef is writing. */
  thinking?: boolean;
}

/**
 * The chef's block at the top of every Plan state.
 *
 * Three levels of voice live here and nowhere else on the screen: the eyebrow
 * (presence), the summary (the claim), and the rationale (the argument). Gold
 * marks the chef SPEAKING — so the eyebrow and the italic line carry it, and
 * the summary, which you read twice, does not.
 */
export function ChefHeader({
  status,
  summary,
  rationale,
  onRevise,
  reviseLabel = "Something's off",
  thinking,
}: ChefHeaderProps) {
  return (
    <header>
      <div className="mb-3.5 flex items-center gap-[11px]">
        <ChefPresence size="header" presenceDot thinking={thinking} />
        <p className="m-0 flex-1 text-[11px] font-semibold tracking-[2px] text-[var(--spec-gold-tint)]">
          YOUR CHEF
        </p>
        <span className="text-[11.5px] font-medium text-[var(--spec-text-caption)]">
          {status}
        </span>
      </div>

      {summary ? (
        <p
          className={cn(
            "m-0 text-[22px] font-[650] leading-[1.32] tracking-[-0.3px] text-[var(--spec-text-feature)]",
            rationale ? "mb-2" : "mb-4"
          )}
          style={{ textWrap: "pretty" }}
        >
          {summary}
        </p>
      ) : null}

      {rationale ? (
        <p
          className="m-0 mb-3.5 text-[14.5px] italic leading-[1.5] text-[var(--spec-gold-voice)]"
          style={{ textWrap: "pretty" }}
        >
          {rationale}
        </p>
      ) : null}

      {onRevise ? (
        <button
          type="button"
          onClick={onRevise}
          className="mb-5 h-9 rounded-[12px] border border-[rgba(240,222,190,0.14)] bg-[rgba(240,222,190,0.06)] px-[13px] text-[13px] font-semibold text-[var(--spec-action)]"
        >
          {reviseLabel}
        </button>
      ) : null}
    </header>
  );
}
