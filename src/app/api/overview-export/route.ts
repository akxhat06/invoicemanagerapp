import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

type Row = Record<string, unknown>;

/** [db_column, human header — readable title case, not snake_case] */
const COMPANY_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["name", "Company Name"],
  ["gst_no", "GST No."],
  ["phone_no", "Phone No."],
  ["email", "Email"],
  ["registered_address", "Registered Address"],
  ["city", "City"],
  ["state", "State"],
  ["pin_code", "Pin Code"],
  ["is_draft", "Draft"],
  ["bank_details", "Bank Details"],
  ["bank_account_holder", "Account Holder Name"],
  ["bank_name", "Bank Name"],
  ["bank_account_number", "Account Number"],
  ["bank_ifsc", "IFSC Code"],
  ["bank_branch", "Branch"],
  ["bank_account_type", "Account Type"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const RETAILER_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["name", "Retailer Name"],
  ["address", "Address"],
  ["contact_no", "Contact No."],
  ["gst_no", "GST No."],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const INVOICE_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["company_name", "Company Name"],
  ["retailer_name", "Retailer Name"],
  ["retailer_address", "Retailer Address"],
  ["contact_no", "Contact No."],
  ["invoice_number", "Invoice No."],
  ["bill_date", "Invoice Date"],
  ["basic_amount", "Basic Amount"],
  ["gst_no", "GST No."],
  ["gst_amount", "GST Amount"],
  ["invoice_amount", "Invoice Amount"],
  ["transportation_amount", "Transportation"],
  ["cd_amount", "Cash Discount"],
  ["total_amount", "Total Amount"],
  ["payment_received", "Payment Received"],
  ["outstanding_amount", "Outstanding Amount"],
  ["is_draft", "Draft"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const TRANSPORT_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["invoice_number", "Invoice No."],
  ["transport_name", "Transport Name"],
  ["lr_no", "LR No."],
  ["lr_date", "LR Date"],
  ["amount", "Amount"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const PAYMENT_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["invoice_number", "Invoice No."],
  ["payment_date", "Payment Date"],
  ["method", "Method"],
  ["amount", "Amount"],
  ["cheque_no", "Cheque No."],
  ["upi_no", "UPI No."],
  ["upi_ref_no", "UPI Reference No."],
  ["neft_utr_no", "NEFT UTR No."],
  ["note", "Note"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const RETURN_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["invoice_number", "Invoice No."],
  ["return_date", "Return Date"],
  ["amount", "Amount"],
  ["note", "Note"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

const COMMISSION_COLUMNS: [string, string][] = [
  ["id", "ID"],
  ["invoice_number", "Invoice No."],
  ["total_amount", "Total Amount"],
  ["total_payment", "Total Payment"],
  ["gst_amount", "GST Amount"],
  ["tsp_amount", "TSP Amount"],
  ["net_amount", "Net Amount"],
  ["commission_percent", "Commission Percent"],
  ["commission_amount", "Commission Amount"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

function cellValue(value: unknown): string | number | boolean {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function projectRows(rows: Row[], spec: [string, string][]): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const [dbKey, label] of spec) {
      if (Object.prototype.hasOwnProperty.call(row, dbKey)) {
        out[label] = cellValue(row[dbKey]);
      }
    }
    return out;
  });
}

function addSheet(workbook: XLSX.WorkBook, tabName: string, rows: Row[], spec: [string, string][]) {
  const projected = projectRows(rows, spec);
  const sheet =
    projected.length > 0 ? XLSX.utils.json_to_sheet(projected) : XLSX.utils.aoa_to_sheet([["No Data"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, tabName);
}

/** Add human-readable links (company name, invoice no.) instead of raw UUIDs where possible. */
function enrichExportRows(params: {
  companyRows: Row[];
  invoiceRows: Row[];
  transportRows: Row[];
  paymentRows: Row[];
  returnRows: Row[];
  commissionRows: Row[];
}) {
  const { companyRows, invoiceRows, transportRows, paymentRows, returnRows, commissionRows } = params;

  const companyNameById = new Map<string, string>();
  for (const c of companyRows) {
    companyNameById.set(String(c.id), String(c.name ?? ""));
  }

  const invoiceNumberById = new Map<string, string>();
  for (const inv of invoiceRows) {
    invoiceNumberById.set(String(inv.id), String(inv.invoice_number ?? ""));
  }

  const invoicesOut = invoiceRows.map((inv) => ({
    ...inv,
    company_name: companyNameById.get(String(inv.company_id)) ?? "",
  }));

  function withInvoiceNo(rows: Row[]) {
    return rows.map((r) => ({
      ...r,
      invoice_number: invoiceNumberById.get(String(r.invoice_id)) ?? "",
    }));
  }

  return {
    invoicesOut,
    transportsOut: withInvoiceNo(transportRows),
    paymentsOut: withInvoiceNo(paymentRows),
    returnsOut: withInvoiceNo(returnRows),
    commissionsOut: withInvoiceNo(commissionRows),
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const [
    companiesRes,
    retailersRes,
    invoicesRes,
    transportsRes,
    paymentsRes,
    returnsRes,
    commissionsRes,
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("retailers").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("retailer_invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("invoice_transports").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("invoice_payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("invoice_goods_returns").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("invoice_commissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const companyRows = (companiesRes.data ?? []) as Row[];
  const invoiceRows = (invoicesRes.data ?? []) as Row[];
  const enriched = enrichExportRows({
    companyRows,
    invoiceRows,
    transportRows: (transportsRes.data ?? []) as Row[],
    paymentRows: (paymentsRes.data ?? []) as Row[],
    returnRows: (returnsRes.data ?? []) as Row[],
    commissionRows: (commissionsRes.data ?? []) as Row[],
  });

  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Companies", companyRows, COMPANY_COLUMNS);
  addSheet(workbook, "Retailers", (retailersRes.data ?? []) as Row[], RETAILER_COLUMNS);
  addSheet(workbook, "Invoices", enriched.invoicesOut, INVOICE_COLUMNS);
  addSheet(workbook, "Transport", enriched.transportsOut, TRANSPORT_COLUMNS);
  addSheet(workbook, "Payments", enriched.paymentsOut, PAYMENT_COLUMNS);
  addSheet(workbook, "Returns", enriched.returnsOut, RETURN_COLUMNS);
  addSheet(workbook, "Commission", enriched.commissionsOut, COMMISSION_COLUMNS);

  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"overview-${date}.xlsx\"`,
      "Cache-Control": "no-store",
    },
  });
}
