"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DisplayMeal, isCookable } from "./plan-helpers";

export interface PastMealRowProps {
  meal: DisplayMeal;
  onFeedback: (feedback: "thumbs_up" | "thumbs_down") => void;
}

// A cooked-this-week meal with a thumbs up/down. Shared by the mid-week view
// ("earlier this week") and the week-wrapped recap ("how'd it go") — both feed
// the same feedback → chef-memory loop.
export function PastMealRow({ meal, onFeedback }: PastMealRowProps) {
  if (!isCookable(meal.slotType)) return null;
  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3 opacity-80">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-widest text-muted-foreground">
          {meal.dayName}
        </p>
        <p className="truncate text-sm">{meal.title}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onFeedback("thumbs_up")}
          aria-label="Liked it"
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-white/10",
            meal.feedback === "thumbs_up"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <ThumbsUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onFeedback("thumbs_down")}
          aria-label="Didn't like it"
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-white/10",
            meal.feedback === "thumbs_down"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <ThumbsDown className="size-4" />
        </button>
      </div>
    </div>
  );
}
