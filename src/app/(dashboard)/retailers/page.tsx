import { RetailersScreen } from "@/components/retailers/retailers-screen";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";

export default async function RetailersPage() {
  const supabase = await createClient();

  const [retRes, invRes, coRes] = await Promise.all([
    supabase.from("retailers").select("*").order("name", { ascending: true }),
    supabase.from("retailer_invoices").select("*").order("bill_date", { ascending: false }),
    supabase.from("companies").select("*").order("name", { ascending: true }),
  ]);

  if (retRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load retailers</p>
        <p className="mt-2 text-red-700 dark:text-red-300">{retRes.error.message}</p>
        <p className="mt-3 text-xs text-red-600/90 dark:text-red-400/90">
          If the table is missing, run{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">supabase/migrations/20260330190000_create_retailers_table.sql</code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  if (invRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Could not load invoices</p>
        <p className="mt-2 text-red-700 dark:text-red-300">{invRes.error.message}</p>
        <p className="mt-3 text-xs text-red-600/90 dark:text-red-400/90">
          If the table is missing, run{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">supabase/migrations/20260329170000_create_retailer_invoices.sql</code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  if (coRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
        <p className="font-semibold">Could not load companies</p>
        <p className="mt-2">{coRes.error.message}</p>
      </div>
    );
  }

  const retailers = (retRes.data ?? []) as RetailerRow[];
  const invoices = (invRes.data ?? []) as RetailerInvoiceRow[];
  const companies = (coRes.data ?? []) as CompanyRow[];

  return (
    <RetailersScreen
      initialRetailers={retailers}
      initialInvoices={invoices}
      initialCompanies={companies}
    />
  );
}
