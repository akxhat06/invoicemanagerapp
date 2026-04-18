export type DashboardNavKey =
  | "dashboard"
  | "companies"
  | "retailers"
  | "invoices"
  | "payments"
  | "credit_notes"
  | "commission";

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
  { key: "payments", label: "Payments", href: "/payments" },
  { key: "credit_notes", label: "Credit Note", href: "/credit-notes" },
  { key: "commission", label: "Commission", href: "/commission" },
];

/** Path without query/hash; no trailing slash except root. */
export function normalizeDashboardPathname(pathname: string): string {
  if (!pathname || pathname === "") return "/";
  let p = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

export function isDashboardNavActive(pathname: string, key: DashboardNavKey): boolean {
  const p = normalizeDashboardPathname(pathname);
  if (key === "dashboard") return p === "/";
  if (key === "companies") return p === "/companies" || p.startsWith("/companies/");
  if (key === "retailers") return p === "/retailers" || p.startsWith("/retailers/");
  if (key === "invoices") return p === "/invoices" || p.startsWith("/invoices/");
  if (key === "payments") return p === "/payments" || p.startsWith("/payments/");
  if (key === "credit_notes") return p === "/credit-notes" || p.startsWith("/credit-notes/");
  if (key === "commission") return p === "/commission" || p.startsWith("/commission/");
  return false;
}
