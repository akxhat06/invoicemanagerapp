import { PaymentsScreen } from "@/components/payments/payments-screen";
import { createClient } from "@/lib/supabase/server";
import type { InvoicePaymentRow, RetailerInvoiceRow } from "@/types/invoice";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ invoiceId?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const preselectedInvoiceId = typeof query.invoiceId === "string" ? query.invoiceId : undefined;
  const supabase = await createClient();

  const [payRes, invRes] = await Promise.all([
    supabase.from("invoice_payments").select("*").order("payment_date", { ascending: false }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
  ]);

  if (payRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load payments</p>
        <p className="mt-2">{payRes.error.message}</p>
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
    <PaymentsScreen
      initialPayments={(payRes.data ?? []) as InvoicePaymentRow[]}
      initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
      preselectedInvoiceId={preselectedInvoiceId}
    />
  );
}
