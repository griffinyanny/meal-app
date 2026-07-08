"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BottomBarProps {
  children: ReactNode;
  // Override the default z-30 (e.g. transient pills that sit above the confirm
  // bar pass "z-40"). twMerge dedupes the z-index conflict.
  className?: string;
}

// The fixed, scroll-independent anchor above the bottom tab bar — home for the
// sticky confirm bar and the transient modify ack/error pills.
export function BottomBar({ children, className }: BottomBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-20 z-30 mx-auto max-w-[430px] px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
