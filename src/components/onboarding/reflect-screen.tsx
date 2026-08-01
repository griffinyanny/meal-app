"use client";

import { AlertTriangle, ArrowRight, Clock, Quote, Shield, UtensilsCrossed } from "lucide-react";
import { ChefPresence } from "@/components/shared/chef-presence";
import { reflectHook, reflectSubline } from "@/lib/onboarding/synthesize";
import {
  chefGuesses,
  isSparse,
  playbackGroups,
  weekDecisions,
} from "@/lib/onboarding/playback";
import { isAllergyRestriction, restrictionLabel } from "@/components/you/constraint-utils";
import type { InterviewState } from "@/lib/onboarding/types";

export interface ReflectScreenProps {
  state: InterviewState;
  onBuildPlan: () => void;
  isSaving: boolean;
  // Answers whose save didn't land, in the user's terms. Empty is the normal
  // case; anything here means this screen must not say "All saved" (BUG-016).
  unsaved: string[];
}

// "and" rather than a bare comma list: this line is an apology, and it should
// read like a sentence a person would say.
function joinAnswers(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// The payoff turn, built to the locked direction (design pass 3, S39). Three
// blocks, always in this order:
//
//   1. THE OPINION      alone on the floor, nothing boxed around it, because a
//                       point of view inside a card is just another field.
//   2. WHAT I'VE GOT    the capture, grouped by kitchen logic, every fact a
//                       sentence rather than a label/value pair.
//   3. SO HERE'S YOUR WEEK  what each captured thing DECIDES about dinner.
//
// The reward for answering more is consequence, not volume: deep answers thicken
// the groups they belong to and sharpen the week list, but the structure never
// changes and nothing is ever marked as a second tier. Nobody is shown what they
// failed to fill in — which is why there is no meter, no count, and no progress
// language anywhere on this screen.
//
// Safety keeps its own object and never shares a card with the opinion or the
// playback, and it sits AFTER the playback (Griffin's call, S39 — the design
// wires the position and he chose the spec's default).
//
// Scrolls, with the CTA on a chrome bar pinned to the bottom edge. The old
// build was a static flex column, which worked only because the content was
// three lines; a fully-engaged interview overflows any phone.
export function ReflectScreen({
  state,
  onBuildPlan,
  isSaving,
  unsaved,
}: ReflectScreenProps) {
  const groups = playbackGroups(state);
  const decisions = weekDecisions(state);
  const guesses = chefGuesses(state);
  const subline = reflectSubline(state);
  const showGuesses = isSparse(state) && guesses.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col gap-[18px]">
          {/* 1 — the opinion. */}
          <div className="animate-turn-in">
            <div className="mb-4 flex items-center gap-3">
              <ChefPresence />
              <p className="m-0 spec-eyebrow text-[var(--spec-gold-tint)]">
                HERE&apos;S WHAT I&apos;M THINKING
              </p>
            </div>
            <p
              data-testid="onboarding-reflect-hook"
              className="m-0 text-[25px] font-[650] leading-[1.26] tracking-[-0.5px] text-[var(--spec-text-feature)] text-pretty"
            >
              {reflectHook(state)}
            </p>
            {subline && (
              <p className="m-0 mt-3.5 text-[16px] leading-[1.5] text-[var(--spec-text-body)] text-pretty">
                {subline}
              </p>
            )}
          </div>

          {/* The user's own sentence, quoted back. The only place in the
              interview where they see their words rather than the chef's
              paraphrase, which is what makes the typing path feel heard. */}
          {state.quotedLine && (
            <div className="flex items-start gap-3 rounded-[16px] border border-[rgba(240,222,190,0.28)] bg-[rgba(240,222,190,0.11)] px-4 py-3.5">
              <Quote
                className="mt-0.5 size-[18px] flex-none text-[rgba(240,222,190,0.55)]"
                strokeWidth={2}
              />
              <div>
                <p className="m-0 mb-1.5 text-[16px] font-semibold leading-[1.45] text-[var(--spec-text-muted)] text-pretty">
                  &ldquo;{state.quotedLine}&rdquo;
                </p>
                <p className="m-0 spec-eyebrow">
                  YOUR WORDS, SO I WROTE THEM DOWN
                </p>
              </div>
            </div>
          )}

          {/* 2 — what I've got. */}
          {groups.length > 0 && (
            <div
              data-testid="onboarding-playback"
              className="spec-glass rounded-[18px] px-[18px] pb-5 pt-[18px]"
            >
              <p className="m-0 mb-4 spec-eyebrow">
                WHAT I&apos;VE GOT
              </p>
              <div className="flex flex-col gap-[15px]">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="m-0 mb-1.5 spec-label">
                      {group.label}
                    </p>
                    {group.facts.map((fact) => (
                      <p
                        key={fact.lead}
                        className="m-0 mb-[5px] text-[15px] leading-[1.5] text-[var(--spec-text-body)] last:mb-0 text-pretty"
                      >
                        <span className="font-semibold text-[var(--spec-text-primary)]">
                          {fact.lead}
                        </span>
                        {/* A `rest` that opens on punctuation continues the
                            lead's own sentence ("2 of you" + ", every night"),
                            so joining with a space would print "2 of you ,". */}
                        {fact.rest
                          ? /^[,.;:!?]/.test(fact.rest)
                            ? fact.rest
                            : ` ${fact.rest}`
                          : ""}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The safety recap. Its own object, never sharing a card, and the
              allergy sub-label is the You tab's exactly — these are the same
              objects that tab will show tomorrow. */}
          {state.restrictions.length > 0 && (
            <div className="rounded-[16px] border border-[rgba(217,106,91,0.28)] bg-[rgba(217,106,91,0.09)] px-[15px] py-[14px]">
              <div className="mb-2.5 flex items-center gap-2">
                <AlertTriangle
                  className="size-3.5 text-[var(--spec-destructive)]"
                  strokeWidth={2}
                />
                <span className="text-[12.5px] font-bold text-[var(--spec-destructive-text)]">
                  I&apos;ll never cook with
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.restrictions.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 rounded-[12px] border border-[rgba(217,106,91,0.32)] bg-[rgba(217,106,91,0.14)] px-[11px] py-1.5 text-[13px] font-semibold text-[#F0D8D3]"
                  >
                    {restrictionLabel(r)}
                    {isAllergyRestriction(r) && (
                      <span className="text-[10.5px] font-semibold text-[rgba(240,216,211,0.7)]">
                        allergy
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Named guesses, for a run that told the chef almost nothing.
              Deliberately not in the safety treatment: a gap is not a warning,
              and dressing it as one borrows weight from the recap above. */}
          {showGuesses && (
            <div
              data-testid="onboarding-guesses"
              className="rounded-[18px] border border-[rgba(240,222,190,0.12)] bg-[rgba(70,58,46,0.52)] px-[17px] pb-[17px] pt-4"
            >
              <p className="m-0 mb-3 spec-eyebrow">
                WHAT I&apos;M GUESSING, UNTIL YOU SAY OTHERWISE
              </p>
              <div className="flex flex-col gap-[11px]">
                {guesses.map((guess, i) => (
                  <div key={guess} className="flex items-start gap-2.5">
                    {i === 0 ? (
                      <Shield
                        className="mt-[3px] size-[15px] flex-none text-[var(--spec-text-muted)]"
                        strokeWidth={1.9}
                      />
                    ) : i === 1 ? (
                      <Clock
                        className="mt-[3px] size-[15px] flex-none text-[var(--spec-text-muted)]"
                        strokeWidth={1.9}
                      />
                    ) : (
                      <UtensilsCrossed
                        className="mt-[3px] size-[15px] flex-none text-[var(--spec-text-muted)]"
                        strokeWidth={1.9}
                      />
                    )}
                    <p className="m-0 text-[14.5px] leading-[1.45] text-[var(--spec-text-body)] text-pretty">
                      {guess}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 — the consequences.
              Gold marks the chef SPEAKING, not content you read (Griffin's
              call, S42). These lines are a list of decisions about your week —
              you read them, and on the deep state there are six of them — so
              they take text.primary. The chef's own voice on this screen keeps
              its gold: the orb, and the unsaved note below. The arrows drop to
              muted for a second reason: cream is what you press, and a marker
              glyph beside a paragraph is not pressable. */}
          <div data-testid="onboarding-week-decisions">
            <p className="m-0 mb-[13px] spec-eyebrow">
              SO HERE&apos;S YOUR WEEK
            </p>
            <div className="flex flex-col gap-3">
              {decisions.map((decision) => (
                <div key={decision} className="flex items-start gap-2.5">
                  <ArrowRight
                    className="mt-1 size-[15px] flex-none text-[var(--spec-text-muted)]"
                    strokeWidth={2.2}
                  />
                  <p className="m-0 text-[15px] leading-[1.45] text-[var(--spec-text-primary)] text-pretty">
                    {decision}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quietly at the end of the scroll, not in the sticky bar. */}
          {unsaved.length > 0 ? (
            <p
              data-testid="onboarding-unsaved-note"
              className="m-0 px-0.5 text-[13px] leading-[1.5] text-[var(--spec-gold-voice)] text-pretty"
            >
              One thing: {joinAnswers(unsaved)} didn&apos;t save. I&apos;ll try again when
              you build your week.
            </p>
          ) : (
            <p className="m-0 px-0.5 text-[13px] leading-[1.5] text-[var(--spec-text-caption)] text-pretty">
              All saved. Change any of it anytime in{" "}
              <span className="font-semibold text-[var(--spec-action)]">You</span>.
            </p>
          )}
        </div>
      </div>

      {/* The bottom edge (spec §07): exactly one thing floats, and it is the
          screen's single primary action. Chrome surface so content scrolling
          under it dims rather than brightens. */}
      <div className="spec-chrome -mx-[26px] flex-none px-[26px] pb-2 pt-3.5">
        <button
          type="button"
          onClick={onBuildPlan}
          disabled={isSaving}
          data-testid="onboarding-build-plan"
          className="flex w-full items-center justify-center gap-2.5 rounded-[16px] bg-[var(--spec-action)] px-4 py-[17px] text-[16px] font-semibold text-[var(--spec-action-on)] shadow-[0_10px_30px_-8px_rgba(244,235,220,0.45)] disabled:opacity-60"
        >
          {isSaving ? "Saving what you told me…" : "Plan my first week"}
          {!isSaving && <ArrowRight className="size-[19px]" strokeWidth={2.2} />}
        </button>
      </div>
    </div>
  );
}
