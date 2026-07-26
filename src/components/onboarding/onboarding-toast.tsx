"use client";

import { useEffect } from "react";

export interface OnboardingToastProps {
  message: string | null;
  onDismiss: () => void;
}

const TOAST_MS = 4000;

// Bottom-anchored notice, matching the You tab's toast vocabulary. Carries the
// "voice coming soon" answer for the unwired mic and any capture error — the
// two things in this flow that need a word without taking over the screen.
export function OnboardingToast({ message, onDismiss }: OnboardingToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      data-testid="onboarding-toast"
      className="animate-turn-in pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6"
    >
      <div className="spec-floating pointer-events-auto max-w-[382px] rounded-[14px] px-4 py-3 text-[0.9rem] text-[var(--spec-text-primary)]">
        {message}
      </div>
    </div>
  );
}
