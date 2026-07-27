"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

// Two jobs, one round-trip. ensureOnboarded has always done the silent DB
// bootstrap (household + membership) on first login; since Phase 1E it also
// reports whether the onboarding interview has run, so the first-run gate rides
// along instead of costing a second call before first paint.
//
// A NULL onboardingCompletedAt means the interview has neither been completed
// nor skipped — both paths stamp it, so this fires exactly once per user.
export function OnboardGuard() {
  const hasRun = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const { mutate } = trpc.user.ensureOnboarded.useMutation({
    onSuccess: (data) => {
      if (data.onboardingCompletedAt) return;
      // Guard against redirecting the interview onto itself.
      if (pathname === "/welcome") return;
      router.replace("/welcome");
    },
  });

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    mutate();
  }, [mutate]);

  return null;
}
