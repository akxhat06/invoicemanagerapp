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
  /**
   * Where to open the menu relative to the trigger. Default `auto` prefers below
   * (fixes upward-only menus in modals near the bottom of the viewport).
   */
  placement?: "auto" | "below" | "above";
  /** Compact trigger height and text (e.g. dense modals). */
  size?: "default" | "sm";
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
  placement = "auto",
  size = "default",
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
  const [menuPos, setMenuPos] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  }>({ left: 0, width: 0, maxHeight: 320 });

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
    const edge = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left;
    if (left + r.width > vw - edge) {
      left = Math.max(edge, vw - r.width - edge);
    }

    const spaceBelow = vh - r.bottom - gap - edge;
    const spaceAbove = r.top - gap - edge;
    const minOpen = 120;

    let useBelow: boolean;
    if (placement === "below") {
      useBelow = true;
    } else if (placement === "above") {
      useBelow = false;
    } else {
      useBelow =
        spaceBelow >= minOpen && (spaceBelow >= spaceAbove || spaceAbove < minOpen);
    }

    if (useBelow) {
      setMenuPos({
        left,
        width: r.width,
        top: r.bottom + gap,
        bottom: undefined,
        maxHeight: Math.min(320, Math.max(spaceBelow, 72)),
      });
    } else {
      setMenuPos({
        left,
        width: r.width,
        top: undefined,
        bottom: vh - r.top + gap,
        maxHeight: Math.min(320, Math.max(spaceAbove, 72)),
      });
    }
  }, [placement]);

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
    size === "sm"
      ? "flex w-full min-h-9 items-center justify-between gap-1.5 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
      : "flex w-full min-h-[48px] items-center justify-between gap-2 text-left text-[15px] outline-none transition disabled:cursor-not-allowed disabled:opacity-50";

  const defaultVisual =
    size === "sm"
      ? "rounded-lg border border-white/10 px-2.5 py-2 shadow-inner hover:border-white/15 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
      : "rounded-xl border border-white/10 px-3.5 py-3 shadow-inner hover:border-white/15 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15";

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
          className={`${size === "sm" ? "h-4 w-4" : "h-5 w-5"} shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
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
              className={`fixed flex flex-col overflow-hidden border border-zinc-600/90 bg-[#1c1f28] shadow-2xl ring-1 ring-black/40 ${size === "sm" ? "rounded-lg" : "rounded-xl"}`}
              style={{
                left: menuPos.left,
                width: menuPos.width,
                top: menuPos.top !== undefined ? menuPos.top : "auto",
                bottom: menuPos.bottom !== undefined ? menuPos.bottom : "auto",
                maxWidth: "min(100vw - 1rem, 24rem)",
                maxHeight: menuPos.maxHeight,
                zIndex: menuZIndex,
              }}
            >
              {showSearch ? (
                <div className={`flex shrink-0 items-center gap-2 border-b border-zinc-700/80 ${size === "sm" ? "p-1.5" : "p-2"}`}>
                  <input
                    ref={searchRef}
                    type="search"
                    autoComplete="off"
                    aria-label="Filter options"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`min-w-0 flex-1 rounded-lg border border-white/10 bg-[#16181f] text-white outline-none placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 ${size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"}`}
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
                        className={`flex ${size === "sm" ? "min-h-9 py-1.5 text-sm" : "min-h-[2.75rem] text-sm"} w-full items-center px-3 text-left transition hover:bg-white/10 ${
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
