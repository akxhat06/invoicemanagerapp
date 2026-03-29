import { CompaniesScreen } from "@/components/companies/companies-screen";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
        <p className="font-semibold">Could not load companies</p>
        <p className="mt-2 text-red-700">{error.message}</p>
        <p className="mt-3 text-xs text-red-600/90">
          If the table is missing, run the SQL in{" "}
          <code className="rounded bg-red-100 px-1">supabase/migrations/</code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  return (
    <CompaniesScreen initialCompanies={(data ?? []) as CompanyRow[]} />
  );
}
