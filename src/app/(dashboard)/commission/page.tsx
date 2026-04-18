import { CommissionScreen } from "@/components/commission/commission-screen";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import type { RetailerRow } from "@/types/retailer";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { CommissionRow } from "@/types/commission";
import { Suspense } from "react";

export default async function CommissionPage() {
  const supabase = await createClient();

  const [retRes, invRes, comRes, coRes] = await Promise.all([
    supabase.from("retailers").select("*").order("name", { ascending: true }),
    supabase.from("retailer_invoices").select("id, company_id").order("bill_date", { ascending: false }),
    supabase.from("commissions").select("*").order("created_at", { ascending: false }),
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
  ]);

  const err = retRes.error || invRes.error || comRes.error || coRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load commission data: {err.message}
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-10 text-center text-sm text-zinc-400">
          Loading commission…
        </div>
      }
    >
      <CommissionScreen
        initialRetailers={(retRes.data ?? []) as RetailerRow[]}
        initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
        initialCommissions={(comRes.data ?? []) as CommissionRow[]}
        initialCompanies={(coRes.data ?? []) as CompanyRow[]}
      />
    </Suspense>
  );
}
