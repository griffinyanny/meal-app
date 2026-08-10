import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed, isDevToolsUser } from "@/lib/access";
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

  // ⚠️ RESOLVED SERVER-SIDE, FROM THE CLAIMS THIS LAYOUT ALREADY VERIFIED, and
  // deliberately NOT as a client query (1F/E). `httpBatchLink` batches a query
  // fired during mount with the page's own primary query, and adding one to
  // Plan's first load reliably reproduced BUG-058's intent-screen remount —
  // measured 0/3 a11y failures without the component, 3/3 with it. Dev chrome
  // must never compete with the app's first load. Free here, and still
  // server-authoritative: the client is told, never trusted.
  const devTools = isDevToolsUser(claimedEmail);

  return (
    <AppShell devTools={devTools}>
      <OnboardGuard />
      {userId && <AnalyticsProvider userId={userId} />}
      {children}
    </AppShell>
  );
}
