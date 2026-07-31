"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Settings } from "lucide-react";
import { aiPlanSchema } from "@/lib/plan-schema";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { NoPlanState } from "./no-plan-state";
import { StreamingPlan } from "./streaming-plan";
import { PlanReview } from "./plan-review";
import { PlanMidweek } from "./plan-midweek";
import { WeekWrappedState } from "./week-wrapped-state";
import { TalkToChefSheet } from "@/components/shared/talk-to-chef-sheet";
import { PlanSheet } from "./sheet/plan-sheet";
import { usePlanSheet } from "./use-plan-sheet";
import { usePlanModify } from "./use-plan-modify";
import { usePlanHydration } from "./use-plan-hydration";
import type { SlotToast } from "./rail/floating-slot";
import { useDebugPanel } from "@/lib/debug/debug-hud";
import type { PlanDay } from "./rail-helpers";
import { takeHandoff } from "@/lib/onboarding/handoff";
import { takePickHandoff } from "@/lib/plan/pick-handoff";
import { seedChips } from "@/lib/onboarding/synthesize";
import {
  type DisplayMeal,
  dayTitle,
  isCookable,
  isPlanElapsed,
  scopedRequest,
  slotToDisplayMeal,
  streamedMealToDisplay,
  todayISO,
  weekStartISO,
} from "./plan-helpers";

const GENERAL_SUGGESTIONS = [
  "Make this week lighter",
  "Add a meal for Saturday",
  "I want to grill this weekend",
  "Something quick — I'm exhausted",
];

// The weekday label for a date already on the plan. Reads it off the rendered
// meals rather than recomputing UTC arithmetic that plan-helpers already owns.
function dayNameOf(meals: DisplayMeal[], date: string): string {
  return meals.find((m) => m.date === date)?.dayName ?? "";
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function PlanPageClient() {
  const utils = trpc.useUtils();
  const planQuery = trpc.plan.current.useQuery();

  const weekStart = useMemo(() => weekStartISO(), []);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatScope, setChatScope] = useState<DisplayMeal | null>(null);

  // Regenerate flow: routes back through the intent-capture screen so a new
  // plan carries fresh weekly intent instead of a blind reroll.
  const [intentMode, setIntentMode] = useState(false);

  // W8 · recipes chosen on the intent screen, before any week exists. They are
  // held here rather than written anywhere: there is no plan to attach them to
  // yet, and the generation POST is where they become a constraint.
  const [intentPicks, setIntentPicks] = useState<{ id: string; title: string }[]>(
    []
  );

  // W10 · a recipe chosen on the Recipes tab when there was no week to put it
  // in. Read once on mount, same as the onboarding hand-off and for the same
  // reason it cannot be read during render: the server has no sessionStorage.
  useEffect(() => {
    const carried = takePickHandoff();
    if (!carried) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntentPicks([carried]);
  }, []);

  // Hand-off from the onboarding interview (Phase 1E #4). The interview ends in
  // THIS screen, pre-filled — door #3, one way to start a week. Read once on
  // mount: takeHandoff clears it, so coming back here later is an ordinary,
  // unseeded intent screen.
  const [seedRequest, setSeedRequest] = useState<{ request?: string } | null>(null);
  useEffect(() => {
    // sessionStorage is exactly the "external system" an effect is for, and it
    // can't be read during render: the server has no session storage, so a
    // lazy initializer would render an unseeded screen on the server and a
    // seeded one on the client. Reading here (and clearing as we read) is the
    // correct place despite the general rule against setState in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeedRequest(takeHandoff());
  }, []);

  // The chips come from the PERSISTED preferences the interview just wrote, not
  // from anything carried across the navigation — so they show what the chef
  // will actually cook with. Only fetched when we actually arrived from the
  // interview.
  const seedPrefsQuery = trpc.user.preferences.useQuery(undefined, {
    enabled: seedRequest !== null,
  });

  const seed = useMemo(() => {
    if (!seedRequest) return undefined;
    const prefs = seedPrefsQuery.data;
    return {
      request: seedRequest.request,
      chips: prefs
        ? seedChips({
            dietaryFramework: prefs.dietaryFramework,
            maxCookTimeWeeknight: prefs.maxCookTimeWeeknight,
            cuisinePreferences: prefs.cuisinePreferences,
            restrictions: prefs.restrictions,
            composition: prefs.householdComposition,
          })
        : [],
    };
  }, [seedPrefsQuery.data, seedRequest]);

  const plan = planQuery.data;
  const persistedMeals = useMemo<DisplayMeal[]>(
    () => (plan ? plan.slots.map(slotToDisplayMeal) : []),
    [plan]
  );

  // Declared before usePlanModify because that hook's onDone callback closes
  // this sheet on success. Hook ORDER is what React cares about, and it is
  // stable either way.
  const sheet = usePlanSheet(persistedMeals);

  // In-place AI-working affordance (see docs/idea-backlog "Something is
  // happening"): pending state where the user is looking, a highlight on the
  // changed day, and a scroll-independent pill for whole-week changes.
  const {
    pending,
    changedDates,
    ack,
    modifyError,
    toast,
    runModify,
    runPick,
    cancelInFlight,
    dismissAck,
    clearError,
  } = usePlanModify((source) => {
    if (source === "chat") setChatOpen(false);
    else sheet.close();
  });

  // BUG-035 · A DEAD STREAM IS NOT AN `error`.
  //
  // `useObject` only populates `error` for a failed REQUEST — a non-OK status or
  // a fetch that throws. The generation route has already returned 200 and
  // opened a body by the time anything can go wrong, so a stream that dies
  // mid-pipe (our own abort, the provider stalling, the function being killed)
  // arrives at the client as a body that simply CLOSES. `isLoading` goes false,
  // `error` stays undefined, and nothing renders — which is why X3 and X4 both
  // found the failure card unreachable on every path, not just the guarded one.
  //
  // `onFinish` is the honest signal: it fires once at stream end and reports the
  // final object, which is `undefined` exactly when no valid plan arrived.
  const [streamDied, setStreamDied] = useState(false);
  /**
   * The generation to run again.
   *
   * Held as the submitted payload rather than reconstructed at retry time: the
   * intent screen has already cleared `intentPicks` by then (they were handed to
   * the server), so rebuilding the ask from current state would silently retry
   * WITHOUT the recipes the person chose.
   */
  const [lastGeneration, setLastGeneration] = useState<Record<
    string,
    unknown
  > | null>(null);

  const {
    object: streamed,
    submit: submitGeneration,
    isLoading: isStreaming,
    error: streamError,
  } = useObject({
    api: "/api/plan/stream",
    schema: aiPlanSchema,
    onFinish: ({ object, error }) => {
      if (error || object === undefined) setStreamDied(true);
      utils.plan.current.invalidate();
    },
  });

  // Either signal means the same thing to the user: they asked for a week and
  // did not get one. `streamError` still matters — it is the one that fires when
  // the request never got off the ground (401, 429, the daily budget).
  const generationFailed = streamDied || !!streamError;

  function retryGeneration() {
    if (!lastGeneration) return;
    setStreamDied(false);
    submitGeneration(lastGeneration);
  }

  const confirmMutation = trpc.plan.confirm.useMutation({
    onSuccess: () => utils.plan.current.invalidate(),
  });

  const feedbackMutation = trpc.plan.feedback.useMutation({
    onMutate: async ({ slotId, feedback }) => {
      await utils.plan.current.cancel();
      utils.plan.current.setData(undefined, (old) =>
        old
          ? {
              ...old,
              slots: old.slots.map((s) =>
                s.id === slotId ? { ...s, feedback } : s
              ),
            }
          : old
      );
    },
    onSettled: () => utils.plan.current.invalidate(),
  });

  const streamedMeals = useMemo<DisplayMeal[]>(() => {
    const list = streamed?.meals ?? [];
    return list
      .map((m) => streamedMealToDisplay(m, weekStart))
      .filter((m): m is DisplayMeal => m !== null)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [streamed, weekStart]);

  function handleGenerate(request?: string) {
    // Abandon any in-flight modify so its late result can't clobber the new plan.
    cancelInFlight();
    setIntentMode(false);
    sheet.close();
    setStreamDied(false);
    const pickedRecipeIds = intentPicks.map((p) => p.id);
    const payload = {
      ...(request ? { request } : {}),
      ...(pickedRecipeIds.length > 0 ? { pickedRecipeIds } : {}),
    };
    setLastGeneration(payload);
    submitGeneration(payload);
    // Cleared once handed over: they are now the week's, and leaving them here
    // would re-apply them to the NEXT generation as well as this one. Picks the
    // person wants carried across a regenerate are carried by the server, off
    // the plan itself, which is the only place that stays true.
    setIntentPicks([]);
  }

  // The picker, invoked from the intent screen — no week exists yet, so the
  // choice is held locally and rides along with the generation POST.
  function openIntentPicker() {
    clearError();
    sheet.openPicker({
      headline: "Cook something you've saved",
      subline: null,
    });
  }

  // THE CHEF ANSWERS WITH A NIGHT (§B) — this never sends a day for the pick,
  // only the night being displaced, which is a fact about the week rather than
  // an instruction about where the recipe goes.
  function handlePick(picks: { id: string; title: string }[]) {
    const invocation = sheet.picker;
    if (!invocation) return;

    // On the intent screen there is no week to change: the pick becomes an input
    // to generation instead. Two different verbs, one picker — which is the
    // point of holding the invocation as data rather than as two components.
    if (!plan || persistedMeals.length === 0 || intentMode) {
      setIntentPicks((current) => {
        const known = new Set(current.map((p) => p.id));
        return [...current, ...picks.filter((p) => !known.has(p.id))];
      });
      sheet.close();
      return;
    }

    runPick(
      picks.map((p) => p.id),
      invocation.replacingDate ?? null
    );
  }

  // Free-form chef submit. When the sheet was opened scoped to a meal, anchor
  // the request to that meal; otherwise it's a whole-week request.
  function handleChatSubmit(text: string) {
    runModify(
      chatScope ? scopedRequest(text, chatScope) : text,
      chatScope,
      "chat"
    );
  }

  function openChat(scope: DisplayMeal | null) {
    clearError();
    setChatScope(scope);
    sheet.close();
    setChatOpen(true);
  }

  function openDay(day: PlanDay) {
    clearError();
    sheet.openDay(day.date);
  }

  function openExpanded(meal: DisplayMeal) {
    clearError();
    sheet.openMeal(meal);
    // Jump this meal's recipe to the front of the hydration walk so it's ready
    // fastest for the sheet the user just opened.
    prioritize(meal.id);
  }

  function startOver() {
    clearError();
    dismissAck();
    setIntentMode(true);
  }

  // How many of the current week's nights are the person's own recipes — the
  // number §B's survival guarantee is about.
  const carriedPickCount = persistedMeals.filter(
    (m) => m.pickedRecipeId != null
  ).length;

  const isConfirmed = plan?.status === "confirmed";
  const hasPast = persistedMeals.some((m) => m.timeframe === "past");
  const isElapsed = isPlanElapsed(persistedMeals);
  // The mid-week "earlier this week / rate what you cooked" layout only makes
  // sense for a plan you've ACCEPTED and are partway through. An unconfirmed
  // draft is always a reviewable week, regardless of the calendar.
  const showMidweek = isConfirmed && hasPast;

  // Background recipe hydration runs whenever a real plan is on screen for review
  // (draft) or mid-week — not during streaming, the intent screen, or a fully
  // elapsed week (nothing left to cook).
  const hydrationEnabled =
    !!plan &&
    persistedMeals.length > 0 &&
    !isStreaming &&
    !intentMode &&
    !isElapsed;
  const { hydrationByDate, prioritize } = usePlanHydration(
    persistedMeals,
    hydrationEnabled
  );


  // THE MEAL ROW IS THE UNIT OF CHANGE FEEDBACK, NEVER THE DAY CONTAINER
  // (1E.5 ledger §C) — the ring sits on the changed row's own 14px radius
  // inside the day's 18px.
  //
  // `plan.modify` reports changed DAYS, so we resolve each one to the cookable
  // rows on it. At R1's one-dinner-per-day that is exactly row-level. At the
  // multi-meal density the ledger also specifies, a whole-day change would ring
  // all three rows — the server owes `changedSlotIds` before that density ships
  // (tracked; not reachable today because generation produces dinners only).
  const idsOnDates = useMemo(
    () => (dates: string[]) =>
      new Set(
        persistedMeals
          .filter((m) => !!m.id && !!m.date && dates.includes(m.date) && isCookable(m.slotType))
          .map((m) => m.id!)
      ),
    [persistedMeals]
  );

  // Read through to a local first: the React Compiler infers `pending` as the
  // dependency and refuses to preserve a memo keyed on `pending?.date`.
  const pendingDate = pending?.date ?? null;
  const workingMealIds = useMemo(
    () => (pendingDate ? idsOnDates([pendingDate]) : new Set<string>()),
    [pendingDate, idsOnDates]
  );
  const landedMealIds = useMemo(
    () => idsOnDates(changedDates),
    [changedDates, idsOnDates]
  );

  function renderBody() {
    if (isStreaming) {
      return (
        <StreamingPlan
          chefSummary={streamed?.chefSummary}
          chefNote={streamed?.chefNote}
          meals={streamedMeals}
          weekStart={weekStart}
        />
      );
    }

    if (intentMode) {
      return (
        <NoPlanState
          onGenerate={handleGenerate}
          isGenerating={isStreaming}
          onCancel={() => setIntentMode(false)}
          replaceWarning={isConfirmed}
          onOpenPicker={openIntentPicker}
          picks={intentPicks}
          onRemovePick={(id) =>
            setIntentPicks((current) => current.filter((p) => p.id !== id))
          }
          // Read off the week being replaced, not off `intentPicks` — these are
          // the picks the SERVER will carry forward, so the sentence and the
          // behaviour come from the same fact.
          carriedPickCount={carriedPickCount}
        />
      );
    }

    // No week to fall back to, so the failure owns the screen. With a plan on
    // file it must NOT — see `slotToast` below.
    if (generationFailed && !plan) {
      return (
        <div className="glass-card flex flex-col items-center space-y-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The chef got stuck putting your plan together.
          </p>
          <Button size="sm" onClick={retryGeneration}>
            Try again
          </Button>
        </div>
      );
    }

    if (plan && persistedMeals.length > 0) {
      const onFeedback = (
        meal: DisplayMeal,
        feedback: "thumbs_up" | "thumbs_down"
      ) => meal.id && feedbackMutation.mutate({ slotId: meal.id, feedback });

      if (isElapsed) {
        return (
          <WeekWrappedState
            meals={persistedMeals}
            isConfirmed={isConfirmed}
            onStartOver={startOver}
            onFeedback={onFeedback}
            toast={slotToast}
          />
        );
      }

      // PlanReview and PlanMidweek share every prop but chefSummary/onFeedback.
      const weekProps = {
        meals: persistedMeals,
        weekStart: plan.weekStart,
        isConfirmed,
        isConfirming: confirmMutation.isPending,
        onConfirm: () => confirmMutation.mutate({ planId: plan.id }),
        onTalkToChef: () => openChat(null),
        onTapMeal: openExpanded,
        onTapDay: openDay,
        // §C/§D's named controls. Each is a ONE-TAP ASK, not a form: the chef
        // already knows the week, so the only thing a picker would add is a
        // decision the user came here to avoid making.
        onDecide: (meal: DisplayMeal) =>
          runModify(
            `Decide ${dayTitle(meal.dayName)}'s dinner for me.`,
            meal,
            "expanded"
          ),
        onAddDays: () =>
          runModify("Add dinners for the nights I haven't planned.", null, "chat"),
        onAddNight: (date: string) =>
          runModify(
            `Cook something on ${dayTitle(dayNameOf(persistedMeals, date))} after all.`,
            null,
            "chat"
          ),
        onStartOver: startOver,
        workingMealIds,
        landedMealIds,
        hydrationByDate,
        toast: slotToast,
      };

      return showMidweek ? (
        <PlanMidweek {...weekProps} onFeedback={onFeedback} />
      ) : (
        <PlanReview
          {...weekProps}
          chefSummary={plan.chefSummary}
          chefNote={plan.chefNote}
        />
      );
    }

    if (streamedMeals.length > 0 || streamed?.chefSummary) {
      return (
        <StreamingPlan
          chefSummary={streamed?.chefSummary}
          chefNote={streamed?.chefNote}
          meals={streamedMeals}
          weekStart={weekStart}
        />
      );
    }

    if (planQuery.isLoading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-28 animate-pulse opacity-30" />
          ))}
        </div>
      );
    }

    // The first-run empty state, and the surface the onboarding interview hands
    // off into when `seed` is present.
    return (
      <NoPlanState
        onGenerate={handleGenerate}
        isGenerating={isStreaming}
        seed={seed}
        onOpenPicker={openIntentPicker}
        picks={intentPicks}
        onRemovePick={(id) =>
          setIntentPicks((current) => current.filter((p) => p.id !== id))
        }
      />
    );
  }

  const chatHeadline = chatScope
    ? `Change ${dayTitle(chatScope.dayName)}'s dinner`
    : "What are you thinking?";

  const sheetOpen = chatOpen || sheet.open;
  // The toast only makes sense over a rendered plan — never over the intent
  // screen or a streaming generation (where a stale modify result could land,
  // and where the count already owns the slot). It is also suppressed behind an
  // open sheet: the sheet shows its own pending line and its own retry, and a
  // message at bottom-96 under a sheet is a message nobody can read.
  // A FAILED GENERATION MUST NOT COST YOU THE WEEK YOU ALREADY HAD (Griffin,
  // S50 — option B over "the error card replaces the screen").
  //
  // You asked for a new week and did not get one. That is a failed action, not
  // a reason to take away the week on file — and replacing the screen has a
  // worse edge: dismissing the error would drop you onto a plan you never asked
  // to see, with nothing explaining why. So the failure borrows §C's slot, the
  // same one a failed modify uses, and the plan behind it stays put.
  //
  // The message says the week is unchanged because the screen alone cannot: a
  // retained plan and a newly-generated one look exactly the same.
  const generationToast: SlotToast | null =
    generationFailed && plan
      ? {
          message: "The chef got stuck. Your week is unchanged.",
          tone: "error",
          action: { label: "Try again", onClick: retryGeneration },
        }
      : null;

  // Generation outranks a modify toast: it is the newer news, and it is the one
  // the user is currently waiting on.
  const slotToast =
    !sheetOpen && !intentMode && !isStreaming ? (generationToast ?? toast) : null;

  const derivedState = isStreaming
    ? "streaming"
    : intentMode
      ? "intent"
      : generationFailed && !plan
        ? "stream-error"
        : plan && persistedMeals.length > 0
          ? isElapsed
            ? "elapsed"
            : showMidweek
              ? "midweek"
              : "review"
          : "empty";

  // Publish live Plan-tab state to the dev debug HUD (see debug-hud.ts).
  useDebugPanel("plan", () => ({
    derivedState,
    planId: plan?.id ?? null,
    status: plan?.status ?? null,
    weekStart: plan?.weekStart ?? null,
    todayUTC: todayISO(),
    todayLocal: new Date().toLocaleDateString(),
    isConfirmed,
    isElapsed,
    showMidweek,
    isStreaming,
    intentMode,
    sheetOpen,
    pending,
    changedDates,
    ack,
    modifyError: modifyError?.message ?? null,
    hydrationEnabled,
    hydrationByDate,
    // BUG-034's two halves, published separately because the SPLIT is the thing
    // under test and the screen cannot show it: two strings rendered at two
    // sizes look much the same as one string that wrapped. Layer B reads the
    // real model's claim and argument here and judges each against its own job.
    chefSummary: plan?.chefSummary ?? null,
    chefNote: plan?.chefNote ?? null,
    slots: persistedMeals.map((m) => ({
      date: m.date,
      timeframe: m.timeframe,
      slotType: m.slotType,
      title: m.title,
      recipeStatus: m.recipeStatus,
      recipeId: m.recipeId,
      // WHICH night the pick landed on is the whole of §B's named-night
      // guarantee, and the eyebrow only says THAT one is a pick, not which one
      // the person asked for. Layer B compares this against the night it opened
      // the picker from.
      pickedRecipeId: m.pickedRecipeId,
      rationale: m.rationale,
      // W6's output is otherwise unobservable from outside: the review sums it
      // into one string and a null slot renders nothing at all, so a week the
      // model priced badly and a week it declined to price look identical on
      // screen. Layer B judges these per-slot, which is where implausibility
      // actually shows up — a plausible sum can hide a $2 salmon night.
      estCostCents: m.estCostCents,
    })),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{greeting()}</p>
        <Link
          href="/you"
          aria-label="Settings"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="size-5" />
        </Link>
      </div>

      {renderBody()}

      <TalkToChefSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        onSubmit={handleChatSubmit}
        isSubmitting={pending?.source === "chat"}
        suggestions={GENERAL_SUGGESTIONS}
        headline={chatHeadline}
        workingLabel={pending?.label}
        modifyError={modifyError?.source === "chat" ? modifyError.message : null}
      />

      {/* Dismissing a sheet no longer clears a failed modify. The sheet used to
          be the error's only home, so closing it was the dismissal; now the
          toast owns the slot and the retry survives the sheet going away. A
          fresh action still clears it — see openChat / openExpanded. */}
      <PlanSheet
        target={sheet.target}
        open={sheet.open}
        onOpenChange={sheet.setOpen}
        onModify={(req) =>
          runModify(req, sheet.meal, sheet.meal ? "expanded" : "day")
        }
        onTalkToChef={() => openChat(sheet.meal)}
        onOpenMeal={openExpanded}
        onOpenPicker={(invocation) => {
          clearError();
          sheet.openPicker(invocation);
        }}
        onPick={handlePick}
        // The picker's empty state hands back the action that works today (`3d`).
        onGenerate={() => {
          sheet.close();
          handleGenerate(undefined);
        }}
        isModifying={
          pending?.source === "expanded" ||
          pending?.source === "day" ||
          pending?.source === "picker"
        }
        workingLabel={pending?.label}
        modifyError={
          modifyError && modifyError.source !== "chat" ? modifyError.message : null
        }
        hydration={sheet.meal?.date ? hydrationByDate[sheet.meal.date] : undefined}
      />
    </div>
  );
}
