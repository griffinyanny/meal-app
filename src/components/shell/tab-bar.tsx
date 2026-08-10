"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FeedbackTrigger } from "@/components/feedback/feedback-trigger";

const tabs = [
  { href: "/plan", label: "Plan", icon: TabIconPlan },
  { href: "/recipes", label: "Recipes", icon: TabIconRecipes },
  { href: "/groceries", label: "Groceries", icon: TabIconGroceries },
  { href: "/you", label: "You", icon: TabIconYou },
] as const;

export interface TabBarProps {
  // Resolved server-side in the (app) layout from verified claims.
  devTools?: boolean;
}

export function TabBar({ devTools = false }: TabBarProps) {
  const pathname = usePathname();

  return (
    // Chrome, not glass (spec §04): the nav has to sit DARKER than the floor so
    // content scrolling underneath dims rather than brightens. It was on
    // glass-surface, which is the L2 lighter rung — the one thing the glass
    // trio's merge onto the elevation ladder could not carry.
    //
    // Square on top (spec §07 Fix 1, 1F/B2): a full-bleed bar pinned to the
    // bottom of the device is system chrome, and a rounded top makes it read as
    // a sheet that got stuck halfway up. `.spec-chrome`'s hairline border-top is
    // what does the separating instead — SH1 asserts both halves.
    <nav
      className="spec-chrome fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                // Gold, and it is one of the few places law 02 names outright:
                // "gold is reserved for the chef's presence — the orb, the live
                // dot, THE ACTIVE TAB, the chef's own voice." It does not spend
                // any of law 06's three-gold budget either, because persistent
                // chrome is a constant rather than an accent.
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-[12px] transition-colors",
                isActive
                  ? "text-[var(--spec-gold)]"
                  : "text-[var(--spec-text-muted)] hover:text-[var(--spec-text-primary)]"
              )}
              aria-label={label}
            >
              <Icon active={isActive} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* ⚠️ IN THE CHROME, NOT FLOATING OVER THE APP — AND THAT PLACEMENT IS A
            BUG FIX, NOT A PREFERENCE (1F/E, S68). The feedback control first
            shipped as `fixed bottom-24 right-3 z-50`, which put it exactly on
            top of Plan's floating action slot (`fixed inset-x-0 bottom-24`,
            full width, z-[38]). X1 caught it: Playwright reported
            `<button data-testid="feedback-trigger"> intercepts pointer events`
            on the toast's **Retry** — so on a phone, tapping Retry after a
            failed modify would have opened the feedback sheet instead, on the
            error path of the north-star flow.

            There is no free fixed band at the bottom: the nav owns 0–64px and
            the slot owns 96–148px, full width. Any floating overlay lands on
            something. The nav is the one region that OWNS its space, so a
            control here reflows the tabs rather than covering anything.

            `flex-none`, so the four tabs keep `flex-1` and merely narrow. Dev
            users only — for everyone else this renders nothing. */}
        {devTools && <FeedbackTrigger />}
      </div>
    </nav>
  );
}

function TabIconPlan({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TabIconRecipes({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function TabIconGroceries({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function TabIconYou({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
