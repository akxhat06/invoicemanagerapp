import { AuthenticatedDashboardShell } from "@/components/dashboard/authenticated-dashboard-shell";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedDashboardShell>{children}</AuthenticatedDashboardShell>;
}
