"use client";

import type { RouterOutputs } from "@/lib/trpc";

export interface AccountFooterProps {
  account: RouterOutputs["user"]["account"] | undefined;
  onSignOut: () => void;
}

// Quiet account/household basics at the bottom of the tab (feature #1).
export function AccountFooter({ account, onSignOut }: AccountFooterProps) {
  return (
    <div className="mt-6 rounded-[18px] border border-[rgba(240,222,190,0.07)] bg-[rgba(240,222,190,0.02)] p-4">
      <h2 className="mb-3 spec-eyebrow">
        Account
      </h2>
      {account?.displayName && (
        <p className="spec-row-title text-foreground">{account.displayName}</p>
      )}
      {account?.email && <p className="spec-body text-muted-foreground">{account.email}</p>}
      {account?.householdName && (
        <p className="spec-body text-muted-foreground">{account.householdName}</p>
      )}
      <button
        type="button"
        onClick={onSignOut}
        className="mt-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
