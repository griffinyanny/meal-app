import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { OnboardGuard } from "@/components/shell/onboard-guard";

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

  return (
    <AppShell>
      <OnboardGuard />
      {children}
    </AppShell>
  );
}
