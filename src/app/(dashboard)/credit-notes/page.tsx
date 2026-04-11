import { CreditNotesWorkspace } from "@/components/credit-notes/credit-notes-workspace";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceGoodsReturnRow, RetailerInvoiceRow } from "@/types/invoice";
import { Suspense } from "react";

export default async function CreditNotesPage() {
  const supabase = await createClient();

  const [retRes, invRes] = await Promise.all([
    supabase.from("invoice_goods_returns").select("*").order("return_date", { ascending: false }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
  ]);

  const err = retRes.error || invRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        Could not load credit notes: {err.message}
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-10 text-center text-sm text-zinc-400">
          Loading credit notes…
        </div>
      }
    >
      <CreditNotesWorkspace
        initialReturns={(retRes.data ?? []) as InvoiceGoodsReturnRow[]}
        initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
      />
    </Suspense>
  );
}
