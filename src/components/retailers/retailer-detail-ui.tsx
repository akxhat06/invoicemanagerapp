import type { ReactNode } from "react";

export function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const v = value?.trim();
  return (
    <div className="border-b border-white/[0.05] py-3.5 last:border-b-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</p>
      <p className={`mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-100 ${mono ? "font-mono text-sm tracking-tight text-zinc-50" : ""}`}>
        {v || "—"}
      </p>
    </div>
  );
}

export function ViewSectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/[0.07] bg-zinc-950/35 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function ViewSubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-1 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{children}</p>
    </div>
  );
}

export function InvoiceDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CreditNoteTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 7H9a5 5 0 1 0 0 10h8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5 4 9l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaymentTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9h.01M9 13h.01M9 17h.01M15 14h.01M15 18h.01" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatIconWrap({ tone, children }: { tone: "neutral" | "cyan" | "teal"; children: ReactNode }) {
  const cls =
    tone === "neutral"
      ? "bg-white/[0.06] text-zinc-300 ring-white/[0.08]"
      : tone === "cyan"
        ? "bg-cyan-500/14 text-cyan-200 ring-cyan-400/15"
        : "bg-teal-500/14 text-teal-200 ring-teal-400/18";
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ${cls}`}
      aria-hidden
    >
      {children}
    </div>
  );
}

export const RETAILER_TAB_BTN =
  "flex w-full min-h-[2.75rem] flex-row items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold leading-tight transition duration-200 sm:gap-1.5 sm:px-2 sm:text-[11px]";

export const RETAILER_TAB_ACTIVE =
  "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
export const RETAILER_TAB_IDLE = "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200";
