import { CompaniesWorkspace } from "@/components/companies/companies-workspace";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Could not load companies: {error.message}
      </div>
    );
  }

  return <CompaniesWorkspace initialCompanies={(data ?? []) as CompanyRow[]} />;
}
