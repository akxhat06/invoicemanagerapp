import { PaymentsScreen } from "@/components/payments/payments-screen";
import { createClient } from "@/lib/supabase/server";
import type { InvoicePaymentRow, RetailerInvoiceRow } from "@/types/invoice";
import { Suspense } from "react";

type PageProps = {
  searchParams?: Promise<{ invoiceId?: string | string[] }>;
};

export default async function PaymentsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const sp = searchParams ? await searchParams : {};
  const raw = sp.invoiceId;
  const preselectedInvoiceId = typeof raw === "string" && raw.length > 0 ? raw : undefined;

  const [payRes, invRes, coRes] = await Promise.all([
    supabase.from("invoice_payments").select("*").order("payment_date", { ascending: false }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
  ]);

  const err = payRes.error || invRes.error || coRes.error;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load payments: {err.message}
      </div>
    );
  }

  const companyNameById: Record<string, string> = {};
  for (const row of coRes.data ?? []) {
    const id = (row as { id: string }).id;
    const name = (row as { name: string }).name;
    if (id) companyNameById[id] = name?.trim() || "Company";
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-10 text-center text-sm text-zinc-400">
          Loading payments…
        </div>
      }
    >
      <PaymentsScreen
        initialPayments={(payRes.data ?? []) as InvoicePaymentRow[]}
        initialInvoices={(invRes.data ?? []) as RetailerInvoiceRow[]}
        companyNameById={companyNameById}
        preselectedInvoiceId={preselectedInvoiceId}
      />
    </Suspense>
  );
}
