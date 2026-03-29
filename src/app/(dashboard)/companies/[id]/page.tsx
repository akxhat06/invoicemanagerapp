import Link from "next/link";
import { gstDisplayLine, hasStructuredBank } from "@/lib/company-display";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRow } from "@/types/company";
import { notFound } from "next/navigation";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    notFound();
  }

  const c = data as CompanyRow;

  return (
    <div className="space-y-6">
      <Link
        href="/companies"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to companies
      </Link>

      <div>
        <h2 className="text-foreground text-xl font-bold">{c.name}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{gstDisplayLine(c)}</p>
      </div>

      {c.is_draft === true ? (
        <p className="rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200/90">
          This company is saved as a <span className="font-semibold">draft</span>. Complete registration from the
          list when you&apos;re ready.
        </p>
      ) : null}

      <dl className="border-border bg-card space-y-4 rounded-2xl border p-4">
        {c.email ? (
          <div>
            <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Email</dt>
            <dd className="mt-1 text-foreground">{c.email}</dd>
          </div>
        ) : null}
        {c.registered_address || c.city || c.state || c.pin_code ? (
          <div>
            <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Registered address</dt>
            <dd className="mt-1 whitespace-pre-wrap text-foreground">
              {[c.registered_address, [c.city, c.state].filter(Boolean).join(", "), c.pin_code]
                .filter(Boolean)
                .join("\n")}
            </dd>
          </div>
        ) : null}
        {c.phone_no ? (
          <div>
            <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Phone</dt>
            <dd className="mt-1 text-foreground">{c.phone_no}</dd>
          </div>
        ) : null}
        {hasStructuredBank(c) ? (
          <>
            {c.bank_account_holder ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Account holder</dt>
                <dd className="mt-1 text-foreground">{c.bank_account_holder}</dd>
              </div>
            ) : null}
            {c.bank_name ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Bank</dt>
                <dd className="mt-1 text-foreground">{c.bank_name}</dd>
              </div>
            ) : null}
            {c.bank_account_number ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Account number</dt>
                <dd className="mt-1 font-mono text-foreground">{c.bank_account_number}</dd>
              </div>
            ) : null}
            {c.bank_ifsc ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">IFSC</dt>
                <dd className="mt-1 font-mono text-foreground">{c.bank_ifsc}</dd>
              </div>
            ) : null}
            {c.bank_branch ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Branch</dt>
                <dd className="mt-1 text-foreground">{c.bank_branch}</dd>
              </div>
            ) : null}
            {c.bank_account_type ? (
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Account type</dt>
                <dd className="mt-1 text-foreground">{c.bank_account_type}</dd>
              </div>
            ) : null}
          </>
        ) : c.bank_details ? (
          <div>
            <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Bank details</dt>
            <dd className="mt-1 whitespace-pre-wrap text-foreground">{c.bank_details}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
