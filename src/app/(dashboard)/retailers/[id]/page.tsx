import { RetailerDetailScreen } from "@/components/retailers/retailer-detail-screen";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import type { RetailerRow } from "@/types/retailer";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function RetailerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [retRes, invRes, coRes] = await Promise.all([
    supabase.from("retailers").select("*").eq("id", id).maybeSingle(),
    supabase.from("retailer_invoices").select("retailer_id, company_id, total_amount").eq("retailer_id", id),
    supabase.from("companies").select("*").order("name", { ascending: true }),
  ]);

  const err = retRes.error || invRes.error || coRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load retailer: {err.message}
      </div>
    );
  }

  const retailer = retRes.data as RetailerRow | null;
  if (!retailer) notFound();

  const companyNameById = new Map((coRes.data ?? []).map((c) => [c.id as string, (c as { name?: string }).name ?? ""]));

  let initialInvoiceCount = 0;
  let initialTotalAmount = 0;
  const companyIds = new Set<string>();
  for (const row of invRes.data ?? []) {
    initialInvoiceCount += 1;
    initialTotalAmount += Number(row.total_amount ?? 0);
    const cid = row.company_id as string | null;
    if (cid) companyIds.add(cid);
  }
  const initialCompanyNames = [...companyIds]
    .map((cid) => companyNameById.get(cid) ?? cid)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return (
    <RetailerDetailScreen
      retailer={retailer}
      companies={(coRes.data ?? []) as CompanyRow[]}
      initialInvoiceCount={initialInvoiceCount}
      initialCompanyNames={initialCompanyNames}
      initialTotalAmount={initialTotalAmount}
    />
  );
}
