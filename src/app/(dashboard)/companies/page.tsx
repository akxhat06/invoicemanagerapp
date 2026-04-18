import { CompaniesWorkspace } from "@/components/companies/companies-workspace";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const [coRes, invRes, commRes] = await Promise.all([
    supabase.from("companies").select("*").order("updated_at", { ascending: false }),
    supabase.from("retailer_invoices").select("id, company_id, total_amount"),
    supabase.from("commissions").select("invoice_id, commission_amount"),
  ]);

  const error = coRes.error || invRes.error || commRes.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load companies: {error.message}
      </div>
    );
  }

  const invoiceCountByCompany: Record<string, number> = {};
  const totalAmountByCompany: Record<string, number> = {};
  const invoiceCompanyMap: Record<string, string> = {}; // invoice_id → company_id
  for (const row of invRes.data ?? []) {
    const cid = row.company_id as string | null;
    const iid = row.id as string | null;
    if (cid) {
      invoiceCountByCompany[cid] = (invoiceCountByCompany[cid] ?? 0) + 1;
      const raw = row.total_amount as number | string | null;
      const n = raw === null || raw === undefined ? 0 : typeof raw === "string" ? parseFloat(raw) : Number(raw);
      totalAmountByCompany[cid] = (totalAmountByCompany[cid] ?? 0) + (Number.isFinite(n) ? n : 0);
    }
    if (iid && cid) invoiceCompanyMap[iid] = cid;
  }

  const commissionAmountByCompany: Record<string, number> = {};
  for (const row of commRes.data ?? []) {
    const iid = row.invoice_id as string | null;
    const cid = iid ? invoiceCompanyMap[iid] : null;
    if (cid) {
      const raw = row.commission_amount as number | string | null;
      const n = raw === null || raw === undefined ? 0 : typeof raw === "string" ? parseFloat(raw) : Number(raw);
      commissionAmountByCompany[cid] = (commissionAmountByCompany[cid] ?? 0) + (Number.isFinite(n) ? n : 0);
    }
  }

  return (
    <CompaniesWorkspace
      initialCompanies={(coRes.data ?? []) as CompanyRow[]}
      initialInvoiceCountByCompany={invoiceCountByCompany}
      initialTotalAmountByCompany={totalAmountByCompany}
      initialCommissionAmountByCompany={commissionAmountByCompany}
    />
  );
}
