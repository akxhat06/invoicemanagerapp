"use client";

import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Option = { startYear: number; label: string };

type Props = {
  options: Option[];
  selectedStartYear: number;
};

const triggerCls =
  "border-border bg-card text-foreground w-full max-w-[200px] rounded-lg border px-3 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-amber-500/30 dark:bg-zinc-900/80";

export function FinancialYearSelect({ options, selectedStartYear }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dropdownOptions = useMemo(
    () =>
      options.map((o) => ({
        value: String(o.startYear),
        label: `${o.label} (Apr–Mar)`,
      })),
    [options]
  );

  function onChange(next: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("fy", next);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Financial year</span>
      <SearchableDropdown
        value={String(selectedStartYear)}
        onChange={onChange}
        options={dropdownOptions}
        showSearch={false}
        allowClear={false}
        triggerClassName={triggerCls}
        placeholderClassName="text-muted-foreground"
        valueClassName="text-foreground"
        inputBackground="transparent"
        menuZIndex={400}
        aria-label="Select financial year"
      />
    </label>
  );
}
