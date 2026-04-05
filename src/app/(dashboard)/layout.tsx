import { AuthenticatedDashboardShell } from "@/components/dashboard/authenticated-dashboard-shell";

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedDashboardShell>{children}</AuthenticatedDashboardShell>;
}
