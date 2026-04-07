import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import type { InvoiceTransportRow, RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { Suspense } from "react";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const [invRes, coRes, retRes, trRes] = await Promise.all([
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
    supabase.from("companies").select("*").order("name", { ascending: true }),
    supabase.from("retailers").select("*").order("name", { ascending: true }),
    supabase.from("invoice_transports").select("*").order("created_at", { ascending: true }),
  ]);

  const err = invRes.error || coRes.error || retRes.error || trRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load invoices: {err.message}
      </div>
    );
  }

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
        initialTransports={(trRes.data ?? []) as InvoiceTransportRow[]}
      />
    </Suspense>
  );
}
