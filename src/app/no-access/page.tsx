// Where a Google account that isn't on ALLOWED_EMAILS lands. Deliberately says
// "not on the list" rather than "wrong password" — there is nothing to retry
// here, and a beta tester who signed in with the wrong Google account needs to
// be told that specifically or they will just loop through sign-in again.
export default function NoAccessPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[430px] space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="spec-screen-title">Not on the list yet</h1>
          <p className="text-muted-foreground spec-body">
            Meal App is in a closed beta. The account you signed in with isn&apos;t on
            the invite list.
          </p>
        </div>
        <p className="text-muted-foreground/60 spec-meta">
          If you were invited, try signing in again with the Google account the
          invite was sent to.
        </p>
        <a
          href="/login"
          className="inline-block glass-card px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-[rgba(240,222,190,0.05)] transition-colors"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
