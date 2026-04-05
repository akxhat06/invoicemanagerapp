"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { startYear: number; label: string };

type Props = {
  options: Option[];
  selectedStartYear: number;
};

export function FinancialYearSelect({ options, selectedStartYear }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("fy", next);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Financial year</span>
      <select
        value={String(selectedStartYear)}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-card text-foreground w-full max-w-[200px] rounded-lg border px-3 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-amber-500/30 dark:bg-zinc-900/80"
        aria-label="Select financial year"
      >
        {options.map((o) => (
          <option key={o.startYear} value={String(o.startYear)}>
            {o.label} (Apr–Mar)
          </option>
        ))}
      </select>
    </label>
  );
}
