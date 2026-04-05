import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { AuthViewTransition } from "@/components/auth/auth-view-transition";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Mobile teaser under logo: sign-in vs sign-up flow. */
  flow?: "signin" | "signup";
  /** `start` top-aligns the form column (e.g. very tall flows). Default `center` matches sign-in. */
  formVerticalAlign?: "center" | "start";
};

function FeatureIcon() {
  return (
    <span
      className="login-split-feature-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md md:h-9 md:w-9 lg:h-10 lg:w-10"
      aria-hidden
    >
      <span className="login-split-feature-glow-dot" />
    </span>
  );
}

/**
 * Split-screen login: theme-colored brand + light form column, server-rendered.
 */
export function AuthLoginShell({ children, flow = "signin", formVerticalAlign = "center" }: Props) {
  return (
    <div className="login-split-root text-foreground flex min-h-[100dvh] min-h-screen flex-col overflow-x-hidden font-sans md:grid md:h-[100dvh] md:max-h-[100dvh] md:grid-cols-[3fr_2fr] md:grid-rows-1 md:overflow-hidden">
      <aside
        className="login-split-brand relative flex min-h-0 shrink-0 flex-col rounded-b-[1.75rem] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pb-10 sm:pt-8 md:h-full md:max-h-full md:overflow-hidden md:rounded-none md:px-8 md:pb-6 md:pt-7 lg:px-10 lg:pb-7 lg:pt-8"
        aria-label="Product information"
      >
        <div className="relative z-[1] flex flex-col gap-4 sm:block sm:gap-0 md:block">
          <div className="flex items-center gap-3 sm:block sm:gap-0">
            <img
              src="/logo3-dark.svg"
              alt="Vishwa Shree Enterprises"
              width={200}
              height={200}
              decoding="async"
              className="h-auto w-[6.75rem] shrink-0 object-contain object-left sm:w-[9.5rem] md:w-32 lg:w-36"
            />
            <div className="min-w-0 flex-1 sm:hidden">
              <p className="login-split-brand-heading font-login-serif text-lg font-semibold leading-snug tracking-tight">
                Streamlined <span className="login-split-accent-text not-italic">Invoice</span>
              </p>
              <p className="login-split-brand-lead mt-1 text-xs leading-snug">
                {flow === "signup" ? "Create your account below to continue." : "Sign in below to continue."}
              </p>
            </div>
          </div>

          <div className="mt-6 hidden max-w-lg sm:mt-8 sm:block md:mt-4 lg:mt-5">
            <h1
              id="auth-brand-title"
              className="login-split-brand-heading font-login-serif text-[clamp(1.65rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-tight md:text-[clamp(1.5rem,2.4vw,2.15rem)] md:leading-[1.15] lg:text-[clamp(1.65rem,2.6vw,2.45rem)]"
            >
              Streamlined <span className="login-split-accent-text not-italic">Invoice</span> Management
            </h1>
            <p className="login-split-brand-lead mt-2 hidden max-w-md text-[15px] leading-relaxed md:mt-3 md:block md:text-sm md:leading-relaxed lg:text-[15px] lg:leading-relaxed">
              Companies, retailers, and billing — Indian FY and GST-friendly exports in one workspace.
            </p>
          </div>
        </div>

        <ul className="relative z-[1] mt-8 hidden flex-col gap-6 md:mt-6 md:flex md:flex-col md:gap-4 lg:mt-7 lg:gap-5">
          <li className="flex gap-2.5 md:gap-3 lg:gap-3.5">
            <FeatureIcon />
            <div className="min-w-0">
              <p className="login-split-brand-feature-heading text-sm font-semibold leading-tight md:text-base lg:text-[1.05rem]">
                Smart invoice processing
              </p>
              <p className="login-split-feature-desc mt-1 text-sm leading-snug md:text-sm md:leading-relaxed lg:text-[15px]">
                Line items, parties, and exports you can trust.
              </p>
            </div>
          </li>
          <li className="flex gap-2.5 md:gap-3 lg:gap-3.5">
            <FeatureIcon />
            <div className="min-w-0">
              <p className="login-split-brand-feature-heading text-sm font-semibold leading-tight md:text-base lg:text-[1.05rem]">
                Real-time analytics
              </p>
              <p className="login-split-feature-desc mt-1 text-sm leading-snug md:text-sm md:leading-relaxed lg:text-[15px]">
                Dashboards that reflect what you enter.
              </p>
            </div>
          </li>
          <li className="flex gap-2.5 md:gap-3 lg:gap-3.5">
            <FeatureIcon />
            <div className="min-w-0">
              <p className="login-split-brand-feature-heading text-sm font-semibold leading-tight md:text-base lg:text-[1.05rem]">
                GST-compliant reports
              </p>
              <p className="login-split-feature-desc mt-1 text-sm leading-snug md:text-sm md:leading-relaxed lg:text-[15px]">
                FY-aware totals for your books.
              </p>
            </div>
          </li>
        </ul>

        <p className="login-split-brand-footer relative z-[1] mt-6 text-[11px] leading-relaxed sm:mt-8 sm:text-xs md:mt-auto md:pt-4 md:text-xs lg:pt-5 lg:text-sm">
          © {new Date().getFullYear()} Invoice Manager · Secure workspace v1
        </p>
      </aside>

      <main className="login-split-main relative flex min-h-0 flex-1 flex-col md:h-full md:max-h-full md:overflow-y-auto">
        <div className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 sm:right-8 sm:top-8">
          <div className="login-split-theme-toggle rounded-xl border border-zinc-200/90 bg-white/90 shadow-sm backdrop-blur-sm">
            <AuthThemeToggle />
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-6 md:px-10 md:pb-4 md:pt-5 lg:px-12 lg:pb-5 lg:pt-6 ${formVerticalAlign === "start" ? "justify-start" : "justify-center"}`}
        >
          <div className="login-split-form-inner mx-auto w-full max-w-[420px] pt-10 sm:pt-8 md:pt-0">
            <AuthViewTransition>{children}</AuthViewTransition>
          </div>
        </div>

        <p className="login-split-main-legal shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 text-center text-[11px] leading-relaxed sm:px-6 sm:pb-6 sm:text-xs md:px-10 md:pb-6 lg:px-12 lg:pb-7">
          By continuing you agree to our{" "}
          <span className="login-split-gold-link font-medium">Terms &amp; Privacy</span>
        </p>
      </main>
    </div>
  );
}
