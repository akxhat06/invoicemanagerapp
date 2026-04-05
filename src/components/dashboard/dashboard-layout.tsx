"use client";

import { formatDisplayName } from "@/lib/display-name";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardMobileNav } from "./dashboard-mobile-nav";
import { DashboardSidebar } from "./dashboard-sidebar";
import { WelcomeTour } from "./welcome-tour";

type Props = {
  username: string | undefined;
  email: string;
  avatarUrl?: string;
  showWelcomeTour?: boolean;
  children: React.ReactNode;
  /** Optional badge on Invoices in nav; omit to hide. */
  invoiceNavBadgeCount?: number;
};

function getHeaderTitle(pathname: string): string {
  if (pathname.startsWith("/companies")) return "Companies";
  if (pathname.startsWith("/retailers")) return "Retailers";
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Dashboard";
}

export function DashboardLayout({
  username,
  email,
  avatarUrl,
  showWelcomeTour = false,
  invoiceNavBadgeCount,
  children,
}: Props) {
  const router = useRouter();
  const [tourVisible, setTourVisible] = useState(showWelcomeTour);
  const pathname = usePathname();
  const title = getHeaderTitle(pathname);
  const isProfilePage = pathname.startsWith("/profile");

  useEffect(() => {
    setTourVisible(showWelcomeTour);
  }, [showWelcomeTour]);

  useEffect(() => {
    document.body.style.overflow = tourVisible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [tourVisible]);

  const displayName = useMemo(() => formatDisplayName(username, email), [username, email]);
  const avatarInitial = useMemo(() => {
    const c = displayName.trim()[0] ?? email[0] ?? "?";
    return c.toUpperCase();
  }, [displayName, email]);

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-background font-sans text-foreground transition-colors md:flex-row">
      {tourVisible && <WelcomeTour onDismissed={() => setTourVisible(false)} />}
      <DashboardSidebar
        displayName={displayName}
        avatarInitial={avatarInitial}
        avatarUrl={avatarUrl}
        pathname={pathname}
        invoiceBadgeCount={invoiceNavBadgeCount}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#0c0c0f]/95 px-4 py-3 shadow-sm backdrop-blur-md md:hidden">
          {isProfilePage ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="relative z-10 inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-zinc-200 transition hover:bg-white/[0.06]"
              aria-label="Go back"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <img
              src="/logo3-dark.svg"
              alt="Vishwa Shree Enterprises"
              width={200}
              height={200}
              decoding="async"
              className="relative z-10 h-10 w-auto max-w-[7.5rem] shrink-0 object-contain object-left"
            />
          )}
          <h1 className="absolute left-1/2 top-1/2 max-w-[50%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[17px] font-bold tracking-tight text-white">
            {title}
          </h1>
          <div className="relative z-10 flex items-center gap-2">
            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-sm font-bold text-white ring-1 ring-white/10 transition hover:bg-zinc-600"
              aria-label="Profile"
            >
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : avatarInitial}
            </Link>
          </div>
        </header>

        <main
          data-tour="main-content"
          className="dashboard-app-main flex min-h-0 flex-1 flex-col px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8 lg:px-10"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <DashboardMobileNav pathname={pathname} invoiceBadgeCount={invoiceNavBadgeCount} />
      </div>
    </div>
  );
}
