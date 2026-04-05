export type DashboardNavKey = "dashboard" | "companies" | "retailers" | "invoices";

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  href: string;
  /** If set, show a small count badge (e.g. pending invoices). */
  showBadge?: boolean;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/" },
  { key: "companies", label: "Companies", href: "/companies" },
  { key: "retailers", label: "Retailers", href: "/retailers" },
  { key: "invoices", label: "Invoices", href: "/invoices", showBadge: true },
];

export function isDashboardNavActive(pathname: string, key: DashboardNavKey): boolean {
  if (key === "dashboard") {
    return pathname === "/" || pathname === "";
  }
  if (key === "companies") return pathname.startsWith("/companies");
  if (key === "retailers") return pathname.startsWith("/retailers");
  if (key === "invoices") return pathname.startsWith("/invoices");
  return false;
}
