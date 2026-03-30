import { RetailerInvoiceDetailScreen } from "@/components/retailers/retailer-invoice-detail-screen";
import { createClient } from "@/lib/supabase/server";
import type {
  InvoiceCommissionRow,
  InvoiceGoodsReturnRow,
  InvoicePaymentRow,
  InvoiceTransportRow,
  RetailerInvoiceRow,
} from "@/types/invoice";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function RetailerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const invoiceRes = await supabase
    .from("retailer_invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (invoiceRes.error || !invoiceRes.data) {
    notFound();
  }

  const [transportsRes, returnsRes, paymentsRes, commissionsRes] = await Promise.all([
    supabase.from("invoice_transports").select("*").eq("invoice_id", id).order("created_at", { ascending: false }),
    supabase
      .from("invoice_goods_returns")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("invoice_payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
    supabase
      .from("invoice_commissions")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/retailers"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to retailers
      </Link>

      <RetailerInvoiceDetailScreen
        invoice={invoiceRes.data as RetailerInvoiceRow}
        initialTransports={(transportsRes.data ?? []) as InvoiceTransportRow[]}
        initialReturns={(returnsRes.data ?? []) as InvoiceGoodsReturnRow[]}
        initialPayments={(paymentsRes.data ?? []) as InvoicePaymentRow[]}
        initialCommissions={(commissionsRes.data ?? []) as InvoiceCommissionRow[]}
      />
    </div>
  );
}
