import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/dashboard/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
