import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/access";
import { AppShell } from "@/components/shell/app-shell";
import { OnboardGuard } from "@/components/shell/onboard-guard";
import { AnalyticsProvider } from "@/components/shell/analytics-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Real auth verification for every (app) page. The proxy only checks cookie
  // PRESENCE (it can't call getUser — long-lived runtime deadlock, see
  // src/lib/supabase/middleware.ts); this layout runs per-request, so it's the
  // right place to verify the session cryptographically before rendering.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login");
  }

  // Gate 2 backstop. The callback rejects at sign-in, but a session already
  // issued outlives that check — so removing someone from ALLOWED_EMAILS has to
  // take effect on their next page view, not their next login. Bounced through a
  // route handler because a Server Component cannot clear the session cookie
  // itself, and redirecting to /login while still holding one would loop.
  const claimedEmail =
    typeof data.claims.email === "string" ? data.claims.email : null;
  if (!isEmailAllowed(claimedEmail)) {
    redirect("/auth/rejected");
  }

  // Identity for analytics comes from the SAME verified claims this layout
  // already checked — never a client-side guess, and never the email.
  const userId = typeof data.claims.sub === "string" ? data.claims.sub : null;

  return (
    <AppShell>
      <OnboardGuard />
      {userId && <AnalyticsProvider userId={userId} />}
      {children}
    </AppShell>
  );
}
