import { CompaniesWorkspace } from "@/components/companies/companies-workspace";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const [coRes, invRes] = await Promise.all([
    supabase.from("companies").select("*").order("updated_at", { ascending: false }),
    supabase.from("retailer_invoices").select("company_id"),
  ]);

  const error = coRes.error || invRes.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load companies: {error.message}
      </div>
    );
  }

  const invoiceCountByCompany: Record<string, number> = {};
  for (const row of invRes.data ?? []) {
    const cid = row.company_id as string | null;
    if (cid) {
      invoiceCountByCompany[cid] = (invoiceCountByCompany[cid] ?? 0) + 1;
    }
  }

  return (
    <CompaniesWorkspace
      initialCompanies={(coRes.data ?? []) as CompanyRow[]}
      initialInvoiceCountByCompany={invoiceCountByCompany}
    />
  );
}
