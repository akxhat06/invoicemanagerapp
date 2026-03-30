"use client";

import { formatDisplayName } from "@/lib/display-name";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { WelcomeTour } from "./welcome-tour";

type Props = {
  username: string | undefined;
  email: string;
  avatarUrl?: string;
  /** True when profile.welcome_tour_completed_at is null */
  showWelcomeTour?: boolean;
  children: React.ReactNode;
};

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function getHeaderTitle(pathname: string): string {
  if (pathname.startsWith("/companies")) return "Companies";
  if (pathname.startsWith("/retailers")) return "Invoices";
  if (pathname.startsWith("/transport")) return "Transport";
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/returns")) return "Returns";
  if (pathname.startsWith("/commission")) return "Commission";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Dashboard";
}

export function DashboardLayout({
  username,
  email,
  avatarUrl,
  showWelcomeTour = false,
  children,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourVisible, setTourVisible] = useState(showWelcomeTour);
  const pathname = usePathname();
  const title = getHeaderTitle(pathname);
  const isProfilePage = pathname.startsWith("/profile");

  useEffect(() => {
    setTourVisible(showWelcomeTour);
  }, [showWelcomeTour]);

  useEffect(() => {
    document.body.style.overflow = menuOpen || tourVisible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, tourVisible]);

  const displayName = useMemo(
    () => formatDisplayName(username, email),
    [username, email]
  );
  const avatarInitial = useMemo(() => {
    const c = displayName.trim()[0] ?? email[0] ?? "?";
    return c.toUpperCase();
  }, [displayName, email]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors">
      {tourVisible && (
        <WelcomeTour onDismissed={() => setTourVisible(false)} />
      )}
      <DashboardSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        displayName={displayName}
        email={email}
        avatarInitial={avatarInitial}
        avatarUrl={avatarUrl}
        pathname={pathname}
      />

      <header className="border-header-border bg-header sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 shadow-sm backdrop-blur">
        {isProfilePage ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="relative z-10 inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Go back"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        ) : (
          <button
            type="button"
            data-tour="menu-button"
            onClick={() => setMenuOpen(true)}
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        )}
        <h1 className="absolute left-1/2 top-1/2 max-w-[50%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
        <div className="relative z-10 flex items-center gap-2">
          <Link
            href="/profile"
            className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold transition hover:opacity-90"
            aria-label="Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              avatarInitial
            )}
          </Link>
        </div>
      </header>

      <main
        data-tour="main-content"
        className="mx-auto max-w-lg px-4 pb-10 pt-5"
      >
        {children}
      </main>
    </div>
  );
}
