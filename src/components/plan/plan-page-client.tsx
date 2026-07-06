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
import { TalkToChefSheet } from "./talk-to-chef-sheet";
import { ExpandedMealSheet } from "./expanded-meal-sheet";
import {
  type DisplayMeal,
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

  const [chefMessage, setChefMessage] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatScope, setChatScope] = useState<DisplayMeal | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<DisplayMeal | null>(null);
  const [expandedOpen, setExpandedOpen] = useState(false);

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

  const modifyMutation = trpc.plan.modify.useMutation({
    onSuccess: (data) => {
      setChefMessage(data.chefResponse);
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

  // Auto-dismiss the chef's modification acknowledgment.
  useEffect(() => {
    if (!chefMessage) return;
    const timer = setTimeout(() => setChefMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [chefMessage]);

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
    setChefMessage(null);
    submitGeneration(request ? { request } : {});
  }

  function handleModify(request: string) {
    setChatOpen(false);
    setExpandedOpen(false);
    modifyMutation.mutate({ request });
  }

  function handleChipClick(meal: DisplayMeal, chip: string) {
    handleModify(`${chip} — for ${meal.dayName.toLowerCase()}'s ${meal.title ?? "dinner"}.`);
  }

  function openChat(scope: DisplayMeal | null) {
    setChatScope(scope);
    setExpandedOpen(false);
    setChatOpen(true);
  }

  function openExpanded(meal: DisplayMeal) {
    setExpandedMeal(meal);
    setExpandedOpen(true);
  }

  const hasPast = persistedMeals.some((m) => m.timeframe === "past");
  const isConfirmed = plan?.status === "confirmed";
  // The mid-week "earlier this week / rate what you cooked" layout only makes
  // sense for a plan you've ACCEPTED and are partway through. An unconfirmed
  // draft is always a reviewable week, regardless of the calendar.
  const showMidweek = isConfirmed && hasPast;

  function renderBody() {
    if (isStreaming) {
      return (
        <StreamingPlan
          chefSummary={streamed?.chefSummary}
          meals={streamedMeals}
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
      return showMidweek ? (
        <PlanMidweek
          meals={persistedMeals}
          isConfirmed={isConfirmed}
          isConfirming={confirmMutation.isPending}
          onConfirm={() => confirmMutation.mutate({ planId: plan.id })}
          onTalkToChef={() => openChat(null)}
          onTapMeal={openExpanded}
          onChipClick={handleChipClick}
          onFeedback={(meal, feedback) =>
            meal.id && feedbackMutation.mutate({ slotId: meal.id, feedback })
          }
        />
      ) : (
        <PlanReview
          chefSummary={plan.chefSummary}
          meals={persistedMeals}
          isConfirmed={isConfirmed}
          isConfirming={confirmMutation.isPending}
          onConfirm={() => confirmMutation.mutate({ planId: plan.id })}
          onTalkToChef={() => openChat(null)}
          onTapMeal={openExpanded}
          onChipClick={handleChipClick}
        />
      );
    }

    if (streamedMeals.length > 0 || streamed?.chefSummary) {
      return (
        <StreamingPlan
          chefSummary={streamed?.chefSummary}
          meals={streamedMeals}
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

    return (
      <NoPlanState onGenerate={handleGenerate} isGenerating={isStreaming} />
    );
  }

  const chatHeadline = chatScope
    ? `Change ${chatScope.dayName.toLowerCase()}'s dinner`
    : "What are you thinking?";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {greeting()}
        </p>
        <Link
          href="/you"
          aria-label="Settings"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="size-5" />
        </Link>
      </div>

      {chefMessage && (
        <div className="glass-card rounded-xl px-4 py-3 text-sm text-primary/90">
          {chefMessage}
        </div>
      )}

      {renderBody()}

      <TalkToChefSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        onSubmit={handleModify}
        isSubmitting={modifyMutation.isPending}
        suggestions={GENERAL_SUGGESTIONS}
        headline={chatHeadline}
      />

      <ExpandedMealSheet
        meal={expandedMeal}
        open={expandedOpen}
        onOpenChange={setExpandedOpen}
        onModify={handleModify}
        onTalkToChef={openChat}
        isModifying={modifyMutation.isPending}
      />
    </div>
  );
}
