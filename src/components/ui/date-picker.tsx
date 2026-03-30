"use client";

import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import "react-day-picker/style.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

function parseISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLabel(value: string): string {
  const d = parseISODate(value);
  if (!d) return "Select date";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function DatePicker({ value, onChange, disabled = false, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => parseISODate(value), [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((s) => !s)}
        disabled={disabled}
        className={`${className} inline-flex items-center justify-between gap-2`}
      >
        <span>{formatLabel(value)}</span>
        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-[120] rounded-xl border border-border bg-card p-2 shadow-2xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (!d) return;
              onChange(toISODate(d));
              setOpen(false);
            }}
            showOutsideDays
            classNames={{
              root: "rdp-root",
              months: "flex",
              month: "space-y-2",
              caption: "relative flex items-center justify-center px-8 py-1",
              caption_label: "text-sm font-semibold text-foreground",
              nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1",
              button_previous:
                "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted",
              button_next:
                "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted",
              month_grid: "w-full border-collapse",
              weekdays: "text-muted-foreground",
              weekday: "h-8 w-9 text-center text-xs font-medium",
              week: "mt-1",
              day: "h-9 w-9 p-0 text-center",
              day_button:
                "h-9 w-9 rounded-md text-sm text-foreground hover:bg-muted aria-selected:bg-accent aria-selected:text-accent-foreground",
              today: "font-semibold ring-1 ring-accent/60",
              selected: "bg-accent text-accent-foreground",
              outside: "text-muted-foreground/50",
              disabled: "opacity-50",
              chevron: "h-4 w-4 fill-current",
            }}
          />
        </div>
      )}
    </div>
  );
}
