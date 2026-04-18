"use client";

import { createClient } from "@/lib/supabase/client";
import { formatDisplayName } from "@/lib/display-name";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardMobileNav } from "./dashboard-mobile-nav";
import { DashboardProfileMenu } from "./dashboard-profile-menu";
import { DashboardSidebar } from "./dashboard-sidebar";
import { WelcomeTour } from "./welcome-tour";

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    // Parse inline bold+italic (***x***), bold (**x**), italic (*x* or _x_)
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    while (remaining.length) {
      const boldItalic = remaining.match(/\*\*\*(.+?)\*\*\*/);
      const bold      = remaining.match(/\*\*(.+?)\*\*/);
      const italic    = remaining.match(/\*(.+?)\*|_(.+?)_/);
      const first = [boldItalic, bold, italic]
        .filter(Boolean)
        .sort((a, b) => (a!.index ?? 0) - (b!.index ?? 0))[0];

      if (!first || first.index === undefined) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
      if (first.index > 0) parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
      if (first === boldItalic) {
        parts.push(<strong key={key++}><em>{boldItalic![1]}</em></strong>);
        remaining = remaining.slice(first.index + boldItalic![0].length);
      } else if (first === bold) {
        parts.push(<strong key={key++}>{bold![1]}</strong>);
        remaining = remaining.slice(first.index + bold![0].length);
      } else {
        const content = italic![1] ?? italic![2];
        parts.push(<em key={key++}>{content}</em>);
        remaining = remaining.slice(first.index + italic![0].length);
      }
    }
    return (
      <span key={li} className={li > 0 ? "mt-1 block" : "block"}>
        {parts}
      </span>
    );
  });
}

type Props = {
  username: string | undefined;
  email: string;
  userId: string;
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
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/credit-notes")) return "Credit Note";
  if (pathname.startsWith("/commission")) return "Commission";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Dashboard";
}

type Message = { id: number; role: "user" | "bot"; text: string; typing?: boolean };

const INITIAL_MESSAGES: Message[] = [
  { id: 0, role: "bot", text: "Hi! I'm your assistant. Ask me anything about your invoices, payments, or commissions." },
];

export function DashboardLayout({
  username,
  email,
  userId,
  avatarUrl,
  showWelcomeTour = false,
  invoiceNavBadgeCount,
  children,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tourVisible, setTourVisible] = useState(showWelcomeTour);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const title = getHeaderTitle(pathname);
  const isProfilePage = pathname.startsWith("/profile");
  const isDashboard = pathname === "/";

  function typewriterReveal(msgId: number, fullText: string) {
    let i = 0;
    const speed = Math.max(8, Math.min(20, Math.round(3000 / fullText.length)));
    function tick() {
      i++;
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, text: fullText.slice(0, i), typing: i < fullText.length } : m)
      );
      if (i < fullText.length) setTimeout(tick, speed);
    }
    setTimeout(tick, speed);
  }

  useEffect(() => {
    setTourVisible(showWelcomeTour);
  }, [showWelcomeTour]);

  useEffect(() => {
    document.body.style.overflow = tourVisible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [tourVisible]);

  useEffect(() => {
    if (!isDashboard) setChatOpen(false);
  }, [isDashboard]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setTyping(false);
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: "bot", text: "Please login again." }]);
        return;
      }
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = await res.json();
      setTyping(false);
      const botText = json.answer ?? json.error ?? "Error getting response";
      const botId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: botId, role: "bot", text: "", typing: true }]);
      typewriterReveal(botId, botText);
    } catch {
      setTyping(false);
      const botId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: botId, role: "bot", text: "", typing: true }]);
      typewriterReveal(botId, "Failed to connect. Try again.");
    }
  }

  const displayName = useMemo(() => formatDisplayName(username, email), [username, email]);
  const avatarInitial = useMemo(() => {
    const c = displayName.trim()[0] ?? email[0] ?? "?";
    return c.toUpperCase();
  }, [displayName, email]);

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-background font-sans text-foreground transition-colors md:flex-row">
      {tourVisible && <WelcomeTour onDismissed={() => setTourVisible(false)} />}

      {/* Backdrop blur overlay when chat is open */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all duration-300"
          onClick={() => setChatOpen(false)}
        />
      )}
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
              <img src="/logo3-dark.svg" alt="" width={44} height={44} decoding="async" className="h-11 w-11 shrink-0 object-contain" aria-hidden />
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

      {/* ── Chatbot FAB + panel (dashboard only) ── */}
      {isDashboard && (
        <>
          <button
            type="button"
            aria-label="Open assistant"
            onClick={() => setChatOpen((o) => !o)}
            className={`fixed bottom-[4.25rem] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f0f1a] ring-1 ring-violet-500/40 shadow-[0_0_24px_rgba(124,58,237,0.45)] transition-all duration-200 hover:scale-110 active:scale-95 md:bottom-6 md:right-6 ${
              chatOpen ? "pointer-events-none opacity-0 scale-75" : "opacity-100 scale-100"
            }`}
          >
            <img src="/bot-icon.svg" width="38" height="38" alt="" aria-hidden />
          </button>

          {/* ── Chat panel ── */}
          <div
            className={`fixed bottom-16 right-0 z-[49] flex w-full flex-col overflow-hidden border-t border-zinc-800 bg-[#0f0f1a] shadow-[0_-4px_40px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out md:bottom-24 md:right-6 md:w-[calc(100vw-2rem)] md:max-w-sm md:rounded-2xl md:border md:shadow-[0_8px_40px_rgba(0,0,0,0.6)] ${
              chatOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0"
            }`}
            style={{ height: "calc(100dvh - 4rem - 3.5rem)" }}
          >
        {/* Panel header */}
        <div className="relative flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <div className="absolute left-3 h-8 w-8 rounded-full bg-violet-600/20 blur-xl" />
          <img src="/bot-icon.svg" width="28" height="28" alt="" aria-hidden className="relative shrink-0 drop-shadow-[0_0_6px_rgba(124,58,237,0.8)]" />
          <div className="relative flex-1">
            <p className="text-xs font-bold text-white">Assistant</p>
            <div className="flex items-center gap-1">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              <p className="text-[9px] text-emerald-400">Online · ready to help</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-label="Close"
            className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages — flex-col, first message at top, newest at bottom */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "bot" && (
                <img src="/bot-icon.svg" width="20" height="20" alt="" aria-hidden className="mb-0.5 shrink-0" />
              )}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white"
                  : "border border-zinc-700/50 bg-zinc-800/80 text-zinc-100"
              }`}>
                {msg.role === "bot" ? renderMarkdown(msg.text) : msg.text}
                {msg.typing && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse rounded-sm bg-violet-400 align-middle" />
                )}
              </div>
              {msg.role === "user" && (
                <div className="mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-700 text-[9px] font-bold text-white">
                  {avatarInitial}
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex items-end gap-1.5">
              <img src="/bot-icon.svg" width="20" height="20" alt="" aria-hidden className="mb-0.5 shrink-0" />
              <div className="flex items-center gap-1 px-1 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-zinc-800 bg-[#0f0f1a] px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900 px-3 py-2 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              aria-label="Send"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 active:scale-95 disabled:opacity-35"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
          </div>
        </>
      )}
    </div>
  );
}
