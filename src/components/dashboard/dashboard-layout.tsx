"use client";

import { formatDisplayName } from "@/lib/display-name";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardMobileNav } from "./dashboard-mobile-nav";
import { DashboardProfileMenu } from "./dashboard-profile-menu";
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
        <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/[0.08] bg-[#0c0c0f]/95 px-4 py-3 shadow-sm backdrop-blur-md md:hidden">
          <div className="flex min-w-0 items-center justify-self-start">
            {isProfilePage ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-11 items-center gap-1 rounded-xl px-1 text-zinc-200 transition hover:bg-white/[0.06]"
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
                alt=""
                width={44}
                height={44}
                decoding="async"
                className="h-11 w-11 shrink-0 object-contain"
                aria-hidden
              />
            )}
          </div>

          <h1 className="min-w-0 max-w-[55vw] justify-self-center truncate text-center text-[17px] font-bold tracking-tight text-white">
            {title}
          </h1>

          <div className="flex min-w-0 justify-end justify-self-end">
            <DashboardProfileMenu
              displayName={displayName}
              avatarInitial={avatarInitial}
              avatarUrl={avatarUrl}
              menuPlacement="below"
              variant="icon"
            />
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
