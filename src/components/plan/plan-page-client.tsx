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
import { ModifyStatusPills } from "./modify-status-pills";
import { TalkToChefSheet } from "@/components/shared/talk-to-chef-sheet";
import { ExpandedMealSheet } from "./expanded-meal-sheet";
import { usePlanModify } from "./use-plan-modify";
import { usePlanHydration } from "./use-plan-hydration";
import { useDebugPanel } from "@/lib/debug/debug-hud";
import { takeHandoff } from "@/lib/onboarding/handoff";
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
  // Track the expanded meal by id (not a frozen snapshot) so the sheet reflects
  // live changes — a recipe finishing hydration flips writing→full in place.
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [expandedOpen, setExpandedOpen] = useState(false);

  // Regenerate flow: routes back through the intent-capture screen so a new
  // plan carries fresh weekly intent instead of a blind reroll.
  const [intentMode, setIntentMode] = useState(false);

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

  // In-place AI-working affordance (see docs/idea-backlog "Something is
  // happening"): pending state where the user is looking, a highlight on the
  // changed day, and a scroll-independent pill for whole-week changes.
  const {
    pending,
    changedDates,
    ack,
    modifyError,
    runModify,
    retry,
    cancelInFlight,
    dismissAck,
    clearError,
  } = usePlanModify((source) => {
    if (source === "chat") setChatOpen(false);
    else if (source === "expanded") setExpandedOpen(false);
  });

  const {
    object: streamed,
    submit: submitGeneration,
    isLoading: isStreaming,
    error: streamError,
  } = useObject({
    api: "/api/plan/stream",
    schema: aiPlanSchema,
    onFinish: () => {
      utils.plan.current.invalidate();
    },
  });

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

  const plan = planQuery.data;
  const persistedMeals = useMemo<DisplayMeal[]>(
    () => (plan ? plan.slots.map(slotToDisplayMeal) : []),
    [plan]
  );
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
    submitGeneration(request ? { request } : {});
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
    setExpandedOpen(false);
    setChatOpen(true);
  }

  function openExpanded(meal: DisplayMeal) {
    clearError();
    setExpandedMealId(meal.id ?? null);
    setExpandedOpen(true);
    // Jump this meal's recipe to the front of the hydration walk so it's ready
    // fastest for the sheet the user just opened.
    prioritize(meal.id);
  }

  function startOver() {
    clearError();
    dismissAck();
    setIntentMode(true);
  }

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

  // The live expanded meal, resolved from the current plan each render.
  const expandedMeal = useMemo(
    () =>
      expandedMealId
        ? persistedMeals.find((m) => m.id === expandedMealId) ?? null
        : null,
    [expandedMealId, persistedMeals]
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
        />
      );
    }

    if (streamError && !plan) {
      return (
        <div className="glass-card flex flex-col items-center space-y-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The chef got stuck putting your plan together.
          </p>
          <Button size="sm" onClick={() => handleGenerate(undefined)}>
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
        onStartOver: startOver,
        workingMealIds,
        landedMealIds,
        hydrationByDate,
      };

      return showMidweek ? (
        <PlanMidweek {...weekProps} onFeedback={onFeedback} />
      ) : (
        <PlanReview
          {...weekProps}
          chefSummary={plan.chefSummary}
          // W6 server half unbuilt: no estCostCents column yet, so no estimate.
          estimateCents={null}
        />
      );
    }

    if (streamedMeals.length > 0 || streamed?.chefSummary) {
      return (
        <StreamingPlan
          chefSummary={streamed?.chefSummary}
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
      />
    );
  }

  const chatHeadline = chatScope
    ? `Change ${dayTitle(chatScope.dayName)}'s dinner`
    : "What are you thinking?";

  const sheetOpen = chatOpen || expandedOpen;
  // Pills only make sense over a rendered plan — never over the intent screen
  // or a streaming generation (where a stale modify result could land).
  const showPills = !sheetOpen && !intentMode && !isStreaming;

  const derivedState = isStreaming
    ? "streaming"
    : intentMode
      ? "intent"
      : streamError && !plan
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
    slots: persistedMeals.map((m) => ({
      date: m.date,
      timeframe: m.timeframe,
      slotType: m.slotType,
      title: m.title,
      recipeStatus: m.recipeStatus,
      recipeId: m.recipeId,
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

      {/* Modify feedback (whole-week ack + inline-error retry) lives at the
          bottom anchor, not a top toast. Gated to a rendered plan so a stale
          result can't float over the intent screen or a streaming generation. */}
      {showPills && (
        <ModifyStatusPills
          ack={ack}
          errorMessage={modifyError?.message ?? null}
          onDismissAck={dismissAck}
          onRetry={retry}
        />
      )}

      <TalkToChefSheet
        open={chatOpen}
        onOpenChange={(o) => {
          setChatOpen(o);
          if (!o) clearError();
        }}
        onSubmit={handleChatSubmit}
        isSubmitting={pending?.source === "chat"}
        suggestions={GENERAL_SUGGESTIONS}
        headline={chatHeadline}
        workingLabel={pending?.label}
        modifyError={modifyError?.source === "chat" ? modifyError.message : null}
      />

      <ExpandedMealSheet
        meal={expandedMeal}
        open={expandedOpen}
        onOpenChange={(o) => {
          setExpandedOpen(o);
          if (!o) clearError();
        }}
        onModify={(req) => runModify(req, expandedMeal, "expanded")}
        onTalkToChef={openChat}
        isModifying={pending?.source === "expanded"}
        workingLabel={pending?.label}
        modifyError={
          modifyError?.source === "expanded" ? modifyError.message : null
        }
        hydration={
          expandedMeal?.date ? hydrationByDate[expandedMeal.date] : undefined
        }
      />
    </div>
  );
}
