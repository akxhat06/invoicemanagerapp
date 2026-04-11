import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { createClient } from "@/lib/supabase/server";
import { sumGoodsReturnAmountsByInvoiceId } from "@/lib/invoice-net-after-returns";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { Suspense } from "react";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const [invRes, coRes, retRes, returnsRes] = await Promise.all([
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
    supabase.from("companies").select("*").order("name", { ascending: true }),
    supabase.from("retailers").select("*").order("name", { ascending: true }),
    supabase.from("invoice_goods_returns").select("invoice_id, amount"),
  ]);

  const err = invRes.error || coRes.error || retRes.error || returnsRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load invoices: {err.message}
      </div>
    );
  }

  const initialReturnAmountByInvoiceId = sumGoodsReturnAmountsByInvoiceId(
    (returnsRes.data ?? []) as { invoice_id: string; amount?: number | string | null }[]
  );

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-10 text-center text-sm text-zinc-400">
          Loading invoices…
        </div>
      }
    >
      <InvoicesWorkspace
        initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
        initialCompanies={(coRes.data ?? []) as CompanyRow[]}
        initialRetailers={(retRes.data ?? []) as RetailerRow[]}
        initialReturnAmountByInvoiceId={initialReturnAmountByInvoiceId}
      />
    </Suspense>
  );
}
