"use client";

import { useMemo, useState } from "react";
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
import { TalkToChefSheet } from "./talk-to-chef-sheet";
import { ExpandedMealSheet } from "./expanded-meal-sheet";
import { usePlanModify } from "./use-plan-modify";
import {
  type DisplayMeal,
  isPlanElapsed,
  scopedRequest,
  slotToDisplayMeal,
  streamedMealToDisplay,
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
  const [expandedMeal, setExpandedMeal] = useState<DisplayMeal | null>(null);
  const [expandedOpen, setExpandedOpen] = useState(false);

  // Regenerate flow: routes back through the intent-capture screen so a new
  // plan carries fresh weekly intent instead of a blind reroll.
  const [intentMode, setIntentMode] = useState(false);

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

  function handleChipClick(meal: DisplayMeal, chip: string) {
    runModify(scopedRequest(chip, meal), meal, "inline");
  }

  function openChat(scope: DisplayMeal | null) {
    clearError();
    setChatScope(scope);
    setExpandedOpen(false);
    setChatOpen(true);
  }

  function openExpanded(meal: DisplayMeal) {
    clearError();
    setExpandedMeal(meal);
    setExpandedOpen(true);
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

  const cardAffordance = {
    pendingDate: pending?.date ?? null,
    pendingLabel: pending?.label ?? "",
    changedDates,
  };

  function renderBody() {
    if (isStreaming) {
      return (
        <StreamingPlan chefSummary={streamed?.chefSummary} meals={streamedMeals} />
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
        isConfirmed,
        isConfirming: confirmMutation.isPending,
        onConfirm: () => confirmMutation.mutate({ planId: plan.id }),
        onTalkToChef: () => openChat(null),
        onTapMeal: openExpanded,
        onChipClick: handleChipClick,
        onStartOver: startOver,
        ...cardAffordance,
      };

      return showMidweek ? (
        <PlanMidweek {...weekProps} onFeedback={onFeedback} />
      ) : (
        <PlanReview {...weekProps} chefSummary={plan.chefSummary} />
      );
    }

    if (streamedMeals.length > 0 || streamed?.chefSummary) {
      return (
        <StreamingPlan chefSummary={streamed?.chefSummary} meals={streamedMeals} />
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

    return <NoPlanState onGenerate={handleGenerate} isGenerating={isStreaming} />;
  }

  const chatHeadline = chatScope
    ? `Change ${chatScope.dayName.toLowerCase()}'s dinner`
    : "What are you thinking?";

  const sheetOpen = chatOpen || expandedOpen;
  // Pills only make sense over a rendered plan — never over the intent screen
  // or a streaming generation (where a stale modify result could land).
  const showPills = !sheetOpen && !intentMode && !isStreaming;

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
      />
    </div>
  );
}
