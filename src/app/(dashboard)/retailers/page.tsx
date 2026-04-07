import { RetailersScreen } from "@/components/retailers/retailers-screen";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import type { RetailerRow } from "@/types/retailer";

export default async function RetailersPage() {
  const supabase = await createClient();

  const [retRes, invRes, coRes] = await Promise.all([
    supabase.from("retailers").select("*").order("name", { ascending: true }),
    supabase.from("retailer_invoices").select("retailer_id, company_id, total_amount"),
    supabase.from("companies").select("*").order("name", { ascending: true }),
  ]);

  const err = retRes.error || invRes.error || coRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load retailers: {err.message}
      </div>
    );
  }

  const companyNameById = new Map((coRes.data ?? []).map((c) => [c.id as string, (c as { name?: string }).name ?? ""]));

  const invoiceCountByRetailer: Record<string, number> = {};
  const totalAmountByRetailer: Record<string, number> = {};
  const companyIdsByRetailer = new Map<string, Set<string>>();

  for (const row of invRes.data ?? []) {
    const rid = row.retailer_id as string | null;
    if (!rid) continue;
    invoiceCountByRetailer[rid] = (invoiceCountByRetailer[rid] ?? 0) + 1;
    totalAmountByRetailer[rid] = (totalAmountByRetailer[rid] ?? 0) + Number(row.total_amount ?? 0);
    const cid = row.company_id as string | null;
    if (cid) {
      if (!companyIdsByRetailer.has(rid)) companyIdsByRetailer.set(rid, new Set());
      companyIdsByRetailer.get(rid)!.add(cid);
    }
  }

  const companyNamesByRetailer: Record<string, string[]> = {};
  for (const [rid, idSet] of companyIdsByRetailer) {
    companyNamesByRetailer[rid] = [...idSet]
      .map((id) => companyNameById.get(id) ?? id)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  return (
    <RetailersScreen
      initialRetailers={(retRes.data ?? []) as RetailerRow[]}
      initialCompanies={(coRes.data ?? []) as CompanyRow[]}
      initialInvoiceCountByRetailer={invoiceCountByRetailer}
      initialCompanyNamesByRetailer={companyNamesByRetailer}
      initialTotalAmountByRetailer={totalAmountByRetailer}
    />
  );
}
