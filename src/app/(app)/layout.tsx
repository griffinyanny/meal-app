import { AppShell } from "@/components/shell/app-shell";
import { OnboardGuard } from "@/components/shell/onboard-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <OnboardGuard />
      {children}
    </AppShell>
  );
}
