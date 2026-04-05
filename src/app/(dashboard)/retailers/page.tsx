import { RetailersScreen } from "@/components/retailers/retailers-screen";
import { createClient } from "@/lib/supabase/server";
import type { RetailerRow } from "@/types/retailer";

export default async function RetailersPage() {
  const supabase = await createClient();
  const retRes = await supabase.from("retailers").select("*").order("name", { ascending: true });

  if (retRes.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load retailers: {retRes.error.message}
      </div>
    );
  }

  return <RetailersScreen initialRetailers={(retRes.data ?? []) as RetailerRow[]} />;
}
