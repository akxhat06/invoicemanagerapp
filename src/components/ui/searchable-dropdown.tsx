"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

export type SearchableDropdownOption = { value: string; label: string };

const DEFAULT_LIST_MAX_HEIGHT = "calc(2.75rem * 5)";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Used when `triggerClassName` is not set (invoice-style dark field). */
  inputBackground?: string;
  className?: string;
  /** Full visual classes for the trigger; merged with layout row. Background usually comes from classes here. */
  triggerClassName?: string;
  /** Placeholder / empty state text color on trigger. */
  placeholderClassName?: string;
  /** Selected value text color on trigger. */
  valueClassName?: string;
  showSearch?: boolean;
  allowClear?: boolean;
  /** Portaled panel z-index. */
  menuZIndex?: number;
  /** Max height CSS for the options list. */
  listMaxHeight?: string;
  /** `aria-label` on the trigger when no visible label is associated. */
  "aria-label"?: string;
};

export function SearchableDropdown({
  id: idProp,
  value,
  onChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  disabled = false,
  inputBackground = "#1E1E24",
  className = "",
  triggerClassName,
  placeholderClassName = "text-zinc-500",
  valueClassName = "text-white",
  showSearch = true,
  allowClear = true,
  menuZIndex = 300,
  listMaxHeight = DEFAULT_LIST_MAX_HEIGHT,
  "aria-label": ariaLabel,
}: Props) {
  const uid = useId();
  const baseId = idProp ?? `dropdown-${uid.replace(/:/g, "")}`;
  const listboxId = `${baseId}-listbox`;
  const panelId = `${baseId}-panel`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, width: 0, bottom: 0, maxHeight: 320 });

  const labelByValue = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  const filtered = useMemo(() => {
    if (!showSearch) return options;
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search, showSearch]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const marginTop = 8;
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
    const id = requestAnimationFrame(attachPanel);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      ro.disconnect();
    };
  }, [open, updatePosition, filtered.length]);

  useEffect(() => {
    if (!open || !showSearch) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, showSearch]);

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

  function pick(next: string) {
    onChange(next);
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

  const selectedLabel = value ? labelByValue.get(value) : undefined;
  const triggerText = selectedLabel ?? placeholder;
  const triggerMuted = !value;

  const layoutRow =
    "flex w-full min-h-[48px] items-center justify-between gap-2 text-left text-[15px] outline-none transition disabled:cursor-not-allowed disabled:opacity-50";

  const defaultVisual =
    "rounded-xl border border-white/10 px-3.5 py-3 shadow-inner hover:border-white/15 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15";

  const triggerCn = [layoutRow, triggerClassName ?? defaultVisual].filter(Boolean).join(" ");

  const triggerStyle: CSSProperties | undefined = triggerClassName ? undefined : { backgroundColor: inputBackground };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          if (!open) setSearch("");
        }}
        className={triggerCn}
        style={triggerStyle}
      >
        <span
          className={`truncate ${triggerMuted ? placeholderClassName : valueClassName}`}
        >
          {triggerText}
        </span>
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

      {open && mounted && !disabled
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="presentation"
              className="fixed flex flex-col overflow-hidden rounded-xl border border-zinc-600/90 bg-[#1c1f28] shadow-2xl ring-1 ring-black/40"
              style={{
                left: menuPos.left,
                width: menuPos.width,
                bottom: menuPos.bottom,
                top: "auto",
                maxWidth: "min(100vw - 1rem, 24rem)",
                maxHeight: menuPos.maxHeight,
                zIndex: menuZIndex,
              }}
            >
              {showSearch ? (
                <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700/80 p-2">
                  <input
                    ref={searchRef}
                    type="search"
                    autoComplete="off"
                    aria-label="Filter options"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#16181f] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                  />
                  {allowClear && value ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      onClick={clearSelection}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              ) : null}
              <ul
                id={listboxId}
                role="listbox"
                aria-labelledby={baseId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                style={{ maxHeight: listMaxHeight }}
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-center text-sm text-zinc-500">No matches</li>
                ) : (
                  filtered.map((o) => (
                    <li key={o.value} role="option" aria-selected={value === o.value}>
                      <button
                        type="button"
                        className={`flex min-h-[2.75rem] w-full items-center px-3 text-left text-sm transition hover:bg-white/10 ${
                          value === o.value ? "bg-amber-500/15 font-medium text-amber-100" : "text-zinc-100"
                        }`}
                        onClick={() => pick(o.value)}
                      >
                        {o.label}
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
