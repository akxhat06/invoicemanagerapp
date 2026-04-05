"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
] as const;

/** ~3 option rows visible; remainder scrolls */
const LIST_MAX_HEIGHT = "calc(2.75rem * 3)";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputBackground?: string;
  /** Matches companies form field styling */
  className?: string;
};

export function StateSearchSelect({
  id: idProp,
  value,
  onChange,
  placeholder = "Select",
  inputBackground = "#1E1E24",
  className = "",
}: Props) {
  const uid = useId();
  const baseId = idProp ?? `state-${uid.replace(/:/g, "")}`;
  const listboxId = `${baseId}-listbox`;
  const panelId = `${baseId}-panel`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  /** Viewport-fixed menu; portaled to body so parent `transform` does not break `fixed` */
  const [menuPos, setMenuPos] = useState({ left: 0, width: 0, bottom: 0, maxHeight: 320 });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...INDIAN_STATES];
    return INDIAN_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [search]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const marginTop = 8;
    /** Bottom edge of panel sits `gap` px above trigger top (viewport coords) */
    const bottom = window.innerHeight - r.top + gap;
    const maxHeight = Math.max(160, r.top - gap - marginTop);
    const vw = window.innerWidth;
    const pad = 8;
    let left = r.left;
    if (left + r.width > vw - pad) {
      left = Math.max(pad, vw - r.width - pad);
    }
    setMenuPos({
      left,
      width: r.width,
      bottom,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(id);
  }, [open, updatePosition, filtered.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    const ro = new ResizeObserver(onScrollOrResize);
    if (triggerRef.current) ro.observe(triggerRef.current);
    const attachPanel = () => {
      if (panelRef.current) ro.observe(panelRef.current);
    };
    attachPanel();
    const id = requestAnimationFrame(attachPanel);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      ro.disconnect();
    };
  }, [open, updatePosition, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearch("");
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | PointerEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setSearch("");
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(state: string) {
    onChange(state);
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }

  function clearSelection() {
    onChange("");
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }

  const triggerLabel = value || placeholder;
  const triggerMuted = !value;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setSearch("");
        }}
        className="flex w-full min-h-[48px] items-center justify-between gap-2 rounded-xl border border-white/10 px-3.5 py-3 text-left text-[15px] shadow-inner outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
        style={{ backgroundColor: inputBackground }}
      >
        <span className={triggerMuted ? "truncate text-zinc-500" : "truncate text-white"}>{triggerLabel}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && mounted
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="presentation"
              className="fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-zinc-600/90 bg-[#1c1f28] shadow-2xl ring-1 ring-black/40"
              style={{
                left: menuPos.left,
                width: menuPos.width,
                bottom: menuPos.bottom,
                top: "auto",
                maxWidth: "min(100vw - 1rem, 24rem)",
                maxHeight: menuPos.maxHeight,
              }}
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700/80 p-2">
                <input
                  ref={searchRef}
                  type="search"
                  autoComplete="off"
                  aria-label="Search states"
                  placeholder="Search state…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#16181f] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
                {value ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <ul
                id={listboxId}
                role="listbox"
                aria-labelledby={baseId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                style={{ maxHeight: LIST_MAX_HEIGHT }}
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-center text-sm text-zinc-500">No matches</li>
                ) : (
                  filtered.map((s) => (
                    <li key={s} role="option" aria-selected={value === s}>
                      <button
                        type="button"
                        className={`flex min-h-[2.75rem] w-full items-center px-3 text-left text-sm transition hover:bg-white/10 ${
                          value === s ? "bg-zinc-500/15 font-medium text-zinc-300" : "text-zinc-100"
                        }`}
                        onClick={() => pick(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
