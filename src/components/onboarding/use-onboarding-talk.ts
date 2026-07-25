"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { Dimension, InterviewState } from "@/lib/onboarding/types";

// The interview's free-text path, split out of use-onboarding so that file
// stays under the 300-line rule.
//
// It is a thin front-end over the SAME capture path the You tab uses
// (user.talk), stamped "onboarding" so what it remembers reads as "you told me
// when we started" in the ledger. There is no second AI pipeline here, and
// there should never be one.

export interface FreeTextCapture {
  submitFreeText: (text: string, dimension: Dimension) => void;
  talkPending: boolean;
}

export interface FreeTextCaptureArgs {
  setState: (updater: (prev: InterviewState) => InterviewState) => void;
  setCaught: (items: string[]) => void;
  showToast: (message: string) => void;
}

export function useFreeTextCapture({
  setState,
  setCaught,
  showToast,
}: FreeTextCaptureArgs): FreeTextCapture {
  const utils = trpc.useUtils();
  const talkMutation = trpc.user.talk.useMutation();

  const submitFreeText = useCallback(
    (text: string, dimension: Dimension) => {
      talkMutation.mutate(
        { request: text, sourceType: "onboarding" },
        {
          onSuccess: async (data) => {
            // The tray lists what the message actually changed, item by item.
            // user.talk has already applied the ops, so this is a confirmation,
            // not a pending edit. When nothing landed as a typed field or a
            // memory there is nothing to itemize, so the chef's own sentence
            // stands in — silence would read as the message being swallowed.
            setCaught(data.caught.length > 0 ? data.caught : [data.reply]);

            // user.talk wrote straight to user_preferences, so the server now
            // knows things this component doesn't. Pull them back before moving
            // on: without this, answering "we're pescatarian" by TYPING would
            // leave the reflect screen, the synthesized memory, and the planner
            // all blind to it — the interview would forget what it just heard.
            //
            // Only the fields the message actually SPOKE TO are adopted, and
            // the server reports those from the ops rather than from the row.
            // Reading the whole row back would import schema defaults as
            // answers: "we do taco night and nobody eats mushrooms" creates the
            // row, `dietary_framework` defaults to "omnivore", and the diet
            // screen would light "No restrictions" over an unanswered question.
            const changed = new Set(data.changed);

            // The write already committed server-side, so a failure here is a
            // read failure only — but an unhandled rejection would leave local
            // state (which is what finishOnboarding synthesizes memories from)
            // never learning what the user just said. Silent divergence is the
            // one outcome this surface can't have.
            let prefs;
            try {
              // staleTime 0: the provider's 30s default would serve this from
              // cache, and a user who corrects themselves twice inside half a
              // minute — normal in a two-minute interview — would have the
              // second correction read back as the first one's answer.
              prefs = await utils.user.preferences.fetch(undefined, {
                staleTime: 0,
              });
            } catch {
              showToast(
                "I saved that, but couldn't read it back. It's in your You tab."
              );
              return;
            }

            setState((s) => ({
              ...s,
              dietaryFramework: changed.has("dietaryFramework")
                ? prefs?.dietaryFramework ?? s.dietaryFramework
                : s.dietaryFramework,
              restrictions: changed.has("restrictions")
                ? (prefs?.restrictions as string[] | null) ?? s.restrictions
                : s.restrictions,
              cuisinePreferences: changed.has("cuisinePreferences")
                ? (prefs?.cuisinePreferences as string[] | null) ?? s.cuisinePreferences
                : s.cuisinePreferences,
              maxCookTimeWeeknight: changed.has("maxCookTimeWeeknight")
                ? prefs?.maxCookTimeWeeknight ?? s.maxCookTimeWeeknight
                : s.maxCookTimeWeeknight,
              // Composition has no talk op today, so it could only ever come
              // back as the row's default; leaving it alone keeps a typed
              // answer on another turn from silently resetting the household.
              freeTextDimensions: s.freeTextDimensions.includes(dimension)
                ? s.freeTextDimensions
                : [...s.freeTextDimensions, dimension],
            }));
          },
          onError: () =>
            showToast("The chef didn't catch that. Try again, or just tap an answer."),
        }
      );
    },
    [setCaught, setState, showToast, talkMutation, utils]
  );

  return { submitFreeText, talkPending: talkMutation.isPending };
}
