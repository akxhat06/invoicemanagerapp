"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps auth form content; remounts on pathname change and runs enter animation.
 * Login ↔ signup use opposite horizontal motion; other auth routes fade.
 */
export function AuthViewTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} data-auth-view={pathname} className="auth-view-enter">
      {children}
    </div>
  );
}
