"use client";

import { completeWelcomeTour } from "@/lib/welcome-tour-actions";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

const HOLE_PADDING = 10;
const TOUR_Z_BACKDROP = 100;
const TOUR_Z_FRAME = 101;
const TOUR_Z_CARD = 102;

const STEPS = [
  {
    title: "Welcome",
    body: "Thanks for signing up. This short tour shows how to move around the app—you can skip anytime.",
    target: null as string | null,
    /** Where to place the card when not centered */
    placement: "center" as const,
  },
  {
    title: "Menu",
    body: "Tap here to open the drawer. From there you can go to Overview, Companies, and Invoices.",
    target: "[data-tour='menu-button']",
    placement: "below-target" as const,
  },
  {
    title: "Your workspace",
    body: "This area shows your screens—dashboard stats, company lists, and invoices. Add companies first, then create retailer invoices.",
    target: "[data-tour='main-content']",
    placement: "bottom" as const,
  },
  {
    title: "You're set",
    body: "That's it. Open the menu anytime to switch pages, or stay on the dashboard.",
    target: null,
    placement: "center" as const,
  },
] as const;

type HoleMetrics = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function useViewportSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const read = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}

function getHoleMetrics(el: Element | null): HoleMetrics | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return {
    top: r.top - HOLE_PADDING,
    left: r.left - HOLE_PADDING,
    width: r.width + HOLE_PADDING * 2,
    height: r.height + HOLE_PADDING * 2,
  };
}

function SpotlightLayers({ hole }: { hole: HoleMetrics }) {
  const { top, left, width, height } = hole;
  const right = left + width;
  const bottom = top + height;

  return (
    <>
      {/* top */}
      <div
        className="bg-background/80 fixed backdrop-blur-[2px] dark:bg-black/55"
        style={{ zIndex: TOUR_Z_BACKDROP, top: 0, left: 0, right: 0, height: Math.max(0, top) }}
        aria-hidden
      />
      {/* bottom */}
      <div
        className="bg-background/80 fixed backdrop-blur-[2px] dark:bg-black/55"
        style={{ zIndex: TOUR_Z_BACKDROP, top: bottom, left: 0, right: 0, bottom: 0 }}
        aria-hidden
      />
      {/* left */}
      <div
        className="bg-background/80 fixed backdrop-blur-[2px] dark:bg-black/55"
        style={{
          zIndex: TOUR_Z_BACKDROP,
          top,
          left: 0,
          width: Math.max(0, left),
          height,
        }}
        aria-hidden
      />
      {/* right */}
      <div
        className="bg-background/80 fixed backdrop-blur-[2px] dark:bg-black/55"
        style={{
          zIndex: TOUR_Z_BACKDROP,
          top,
          left: right,
          right: 0,
          height,
        }}
        aria-hidden
      />
    </>
  );
}

type Props = {
  onDismissed?: () => void;
};

export function WelcomeTour({ onDismissed }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hole, setHole] = useState<HoleMetrics | null>(null);
  const { w: vw, h: vh } = useViewportSize();

  const stepConfig = STEPS[step];
  const selector = stepConfig.target;

  const updateHole = useCallback(() => {
    if (!selector) {
      setHole(null);
      return;
    }
    const el = document.querySelector(selector);
    setHole(getHoleMetrics(el));
  }, [selector]);

  useLayoutEffect(() => {
    updateHole();
    const t = window.setTimeout(updateHole, 50);
    window.addEventListener("resize", updateHole);
    window.addEventListener("scroll", updateHole, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateHole);
      window.removeEventListener("scroll", updateHole, true);
    };
  }, [updateHole, step]);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-tour-highlight]");
    nodes.forEach((n) => {
      n.removeAttribute("data-tour-highlight");
      n.classList.remove("relative", "z-[103]");
    });
    if (!selector) return;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    el.setAttribute("data-tour-highlight", "true");
    el.classList.add("relative", "z-[103]");
    return () => {
      el.removeAttribute("data-tour-highlight");
      el.classList.remove("relative", "z-[103]");
    };
  }, [selector, step]);

  const finish = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await completeWelcomeTour();
    setBusy(false);
    if (result.ok) {
      onDismissed?.();
      router.refresh();
    } else {
      setError("error" in result ? result.error : "Could not save your progress. Try again.");
    }
  }, [onDismissed, router]);

  const skip = useCallback(async () => {
    await finish();
  }, [finish]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void finish();
    }
  }, [step, finish]);

  const { title, body } = stepConfig;
  const isLast = step === STEPS.length - 1;
  const useSpotlight = selector != null && hole != null && vw > 0;

  const cardStyle = useMemo((): CSSProperties => {
    if (!useSpotlight || !hole) {
      return {
        zIndex: TOUR_Z_CARD,
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(100% - 2rem, 28rem)",
      };
    }

    const pad = 12;
    const cardMaxW = Math.min(vw - 32, 448);

    if (stepConfig.placement === "below-target") {
      let top = hole.top + hole.height + pad;
      const left = Math.max(16, Math.min(hole.left, vw - cardMaxW - 16));
      const estHeight = 280;
      if (top + estHeight > vh - 24) {
        top = Math.max(16, hole.top - estHeight - pad);
      }
      return {
        zIndex: TOUR_Z_CARD,
        position: "fixed",
        top,
        left,
        width: cardMaxW,
        maxWidth: "calc(100vw - 2rem)",
      };
    }

    if (stepConfig.placement === "bottom") {
      return {
        zIndex: TOUR_Z_CARD,
        position: "fixed",
        left: "50%",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        width: cardMaxW,
        maxWidth: "calc(100vw - 2rem)",
      };
    }

    return {
      zIndex: TOUR_Z_CARD,
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: cardMaxW,
    };
  }, [useSpotlight, hole, stepConfig.placement, vw, vh]);

  const frameStyle: CSSProperties | null =
    useSpotlight && hole
      ? {
          zIndex: TOUR_Z_FRAME,
          position: "fixed",
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          pointerEvents: "none",
          borderRadius: "0.75rem",
          boxShadow: "0 0 0 2px var(--accent, #e0c068), 0 0 0 6px rgba(224, 192, 104, 0.35)",
        }
      : null;

  return (
    <div className="fixed inset-0" style={{ zIndex: TOUR_Z_BACKDROP }} role="presentation">
      {useSpotlight && hole && vw > 0 && (
        <>
          <SpotlightLayers hole={hole} />
          {frameStyle && <div style={frameStyle} aria-hidden />}
        </>
      )}

      {!useSpotlight && (
        <div
          className="bg-background/85 fixed inset-0 backdrop-blur-[2px] dark:bg-black/60"
          style={{ zIndex: TOUR_Z_BACKDROP }}
          aria-hidden
        />
      )}

      <div
        className="border-border bg-card text-card-foreground rounded-2xl border p-5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        aria-describedby="welcome-tour-desc"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.14em]">
            Quick tour · {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => void skip()}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition disabled:opacity-50"
          >
            Skip
          </button>
        </div>
        <h2 id="welcome-tour-title" className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p id="welcome-tour-desc" className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
          {body}
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? void finish() : next())}
            disabled={busy}
            className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {busy ? "Saving…" : isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
