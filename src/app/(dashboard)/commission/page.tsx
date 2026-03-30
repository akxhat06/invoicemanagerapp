import { CommissionsScreen } from "@/components/commissions/commissions-screen";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceCommissionRow, RetailerInvoiceRow } from "@/types/invoice";

export default async function CommissionPage({
  searchParams,
}: {
  searchParams?: Promise<{ invoiceId?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const preselectedInvoiceId = typeof query.invoiceId === "string" ? query.invoiceId : undefined;
  const supabase = await createClient();

  const [comRes, invRes] = await Promise.all([
    supabase.from("invoice_commissions").select("*").order("created_at", { ascending: false }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
  ]);

  if (comRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load commissions</p>
        <p className="mt-2">{comRes.error.message}</p>
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
    <CommissionsScreen
      initialCommissions={(comRes.data ?? []) as InvoiceCommissionRow[]}
      initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
      preselectedInvoiceId={preselectedInvoiceId}
    />
  );
}
