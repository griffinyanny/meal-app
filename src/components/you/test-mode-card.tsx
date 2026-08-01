"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { trpc } from "@/lib/trpc";

export interface TestModeCardProps {
  onError: (message: string) => void;
}

// Test mode (Griffin, S39). Renders ONLY for accounts the server has allowlisted
// via DEV_TOOLS_EMAILS, so for everyone else this component returns null and the
// mutation behind it throws FORBIDDEN.
//
// Not a hidden gesture. The original ask was a secret double-tap, which is the
// right shape when a control is visible to all users and must be hard to hit by
// accident. Once the server decides who sees it, hiding it again only makes it
// hard for the one person who needs it to find on a phone. So it is plainly
// labelled, visually quiet, and behind a two-step confirm.
export function TestModeCard({ onError }: TestModeCardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [armed, setArmed] = useState(false);

  const enabledQuery = trpc.user.devToolsEnabled.useQuery();
  const reset = trpc.user.resetOnboarding.useMutation({
    onSuccess: async () => {
      // Everything downstream reads preferences and memories, and both were just
      // deleted. Clearing the cache before navigating stops the interview from
      // opening on top of a stale picture of a user who no longer exists.
      await utils.invalidate();
      router.replace("/welcome");
    },
    onError: () => onError("Couldn't reset. Check DEV_TOOLS_EMAILS on the server."),
  });

  if (!enabledQuery.data?.enabled) return null;

  return (
    <div className="mt-4 rounded-[18px] border border-dashed border-[rgba(240,222,190,0.12)] bg-[rgba(240,222,190,0.02)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <FlaskConical className="size-3.5 text-muted-foreground" strokeWidth={2} />
        <h2 className="spec-eyebrow">
          Test mode
        </h2>
      </div>
      <p className="mb-3 spec-body text-muted-foreground">
        Clears your preferences and the memories the interview wrote, then starts
        the first run again. Memories from real use are kept.
      </p>
      {armed ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
            data-testid="you-reset-onboarding-confirm"
            className="text-sm font-semibold text-destructive transition-opacity disabled:opacity-50"
          >
            {reset.isPending ? "Resetting…" : "Yes, start over"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          data-testid="you-reset-onboarding"
          className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Restart onboarding
        </button>
      )}
    </div>
  );
}
