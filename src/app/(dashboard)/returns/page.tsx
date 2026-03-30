import { ReturnsScreen } from "@/components/returns/returns-screen";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceGoodsReturnRow, RetailerInvoiceRow } from "@/types/invoice";

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams?: Promise<{ invoiceId?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const preselectedInvoiceId = typeof query.invoiceId === "string" ? query.invoiceId : undefined;
  const supabase = await createClient();

  const [retRes, invRes] = await Promise.all([
    supabase.from("invoice_goods_returns").select("*").order("return_date", { ascending: false }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
  ]);

  if (retRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load returns</p>
        <p className="mt-2">{retRes.error.message}</p>
      </div>
    );
  }
  if (invRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load invoices</p>
        <p className="mt-2">{invRes.error.message}</p>
      </div>
    );
  }

  return (
    <ReturnsScreen
      initialReturns={(retRes.data ?? []) as InvoiceGoodsReturnRow[]}
      initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
      preselectedInvoiceId={preselectedInvoiceId}
    />
  );
}
