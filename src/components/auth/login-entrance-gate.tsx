"use client";

import { LoginOpeningAnimation } from "@/components/auth/login-opening-animation";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { useLayoutEffect, useState, type ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-login-opening-outfit",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-login-opening-cormorant",
  display: "swap",
});

const STORAGE_KEY = "vse_login_opening_done";

type Props = {
  children: ReactNode;
};

/**
 * Plays the full-screen opening animation once per browser tab session, then renders children (existing login shell).
 */
export function LoginEntranceGate({ children }: Props) {
  const [showAnimation, setShowAnimation] = useState(true);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setShowAnimation(false);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const handleComplete = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowAnimation(false);
  };

  if (showAnimation) {
    return (
      <div className={`${outfit.variable} ${cormorant.variable}`}>
        <LoginOpeningAnimation onComplete={handleComplete} />
      </div>
    );
  }

  return <>{children}</>;
}
