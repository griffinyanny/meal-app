"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export function OnboardGuard() {
  const hasRun = useRef(false);
  const { mutate } = trpc.user.ensureOnboarded.useMutation();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    mutate();
  }, [mutate]);

  return null;
}
