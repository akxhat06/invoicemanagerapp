"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import { useWorkspaceUiSession } from "@/hooks/use-workspace-ui-session";
import type { InvoiceGoodsReturnRow, RetailerInvoiceRow } from "@/types/invoice";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from "react";

type Props = {
  initialReturns: InvoiceGoodsReturnRow[];
  initialInvoices: RetailerInvoiceRow[];
};

type PanelMode = "closed" | "add";

type CreditNotesUiSessionV3 = {
  v: 3;
  panel: PanelMode;
  invoiceId: string;
  creditDate: string;
  qtyToReturn: string;
  goodsReturnAmount: string;
};

const CANVAS = "#101014";
const INPUT_BG = "#1E1E24";

function fieldClassDark(multiline = false) {
  return [
    "w-full rounded-xl border border-white/10 bg-[#1E1E24] px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition",
    "placeholder:text-zinc-500 hover:border-white/15 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15",
    multiline ? "min-h-[80px] resize-y" : "",
  ].join(" ");
}

const labelDark = "mb-1.5 block text-sm font-medium text-zinc-100";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function invoiceLineQty(inv: RetailerInvoiceRow): number {
  return Math.max(1, Math.floor(Number(inv.quantity ?? 1)));
}

function roundGoodsReturnAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseAmountInput(v: string): number {
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function CreditNoteDocGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M9 14h6M9 18h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11l-2 2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CreditNotesWorkspace({ initialReturns, initialInvoices }: Props) {
  const router = useRouter();
  const [returns, setReturns] = useState(initialReturns);
  const [invoices] = useState(initialInvoices);

  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [saving, setSaving] = useState(false);

  const [invoiceId, setInvoiceId] = useState("");
  const [creditDate, setCreditDate] = useState(todayISODate());
  const [qtyToReturn, setQtyToReturn] = useState("1");
  const [goodsReturnAmount, setGoodsReturnAmount] = useState("");

  /** When true, next `openAdd` keeps restored draft instead of calling `resetForm`. */
  const skipResetOnOpenAddRef = useRef(false);

  const inputStyle = { backgroundColor: INPUT_BG } as CSSProperties;

  useEffect(() => {
    setReturns(initialReturns);
  }, [initialReturns]);

  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const invoiceSelectOptions = useMemo(
    () =>
      invoices.map((i) => ({
        value: i.id,
        label: `${i.invoice_number}${i.retailer_name?.trim() ? ` — ${i.retailer_name.trim()}` : ""}`,
      })),
    [invoices]
  );

  const selectedInvoice = invoiceId ? invoiceById.get(invoiceId) ?? null : null;
  const invoiceQty = selectedInvoice ? invoiceLineQty(selectedInvoice) : null;

  const resetForm = useCallback(() => {
    setInvoiceId("");
    setCreditDate(todayISODate());
    setQtyToReturn("1");
    setGoodsReturnAmount("");
  }, []);

  const applyCreditNotesUiSession = useCallback(
    (s: CreditNotesUiSessionV3) => {
      skipResetOnOpenAddRef.current = false;
      if (s.panel === "closed") {
        setPanel("closed");
        resetForm();
        return;
      }
      skipResetOnOpenAddRef.current = true;
      setInvoiceId(s.invoiceId ?? "");
      setCreditDate(s.creditDate || todayISODate());
      setQtyToReturn(s.qtyToReturn ?? "1");
      setGoodsReturnAmount(s.goodsReturnAmount ?? "");
      setPanel("add");
    },
    [resetForm]
  );

  useWorkspaceUiSession<CreditNotesUiSessionV3>({
    route: "credit-notes",
    version: 3,
    restoreReady: true,
    buildSnapshot: () => ({
      v: 3,
      panel,
      invoiceId,
      creditDate,
      qtyToReturn,
      goodsReturnAmount,
    }),
    applyRestore: applyCreditNotesUiSession,
    saveDeps: [panel, invoiceId, creditDate, qtyToReturn, goodsReturnAmount],
  });

  const finalizeClose = useCallback(() => {
    setPanel("closed");
    resetForm();
    isAnimatingClose.current = false;
  }, [resetForm]);

  const requestClose = useCallback(() => {
    if (saving) return;
    isAnimatingClose.current = true;
    setSheetOpen(false);
  }, [saving]);

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  function handleSheetTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "transform") return;
    if (isAnimatingClose.current && !sheetOpenRef.current) {
      finalizeClose();
    }
  }

  /** If `transitionend` never fires (browser quirks), avoid leaving an invisible z-100 scrim that blocks all clicks. */
  useEffect(() => {
    if (sheetOpen || !isAnimatingClose.current) return;
    const t = window.setTimeout(() => {
      if (isAnimatingClose.current && !sheetOpenRef.current) finalizeClose();
    }, 550);
    return () => window.clearTimeout(t);
  }, [sheetOpen, finalizeClose]);

  useEffect(() => {
    const prev = prevPanelRef.current;
    prevPanelRef.current = panel;
    if (panel !== "closed" && prev === "closed") {
      isAnimatingClose.current = false;
      setSheetOpen(false);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true)));
      return () => cancelAnimationFrame(id);
    }
    if (panel === "closed") {
      setSheetOpen(false);
    }
  }, [panel]);

  useEffect(() => {
    if (panel === "closed") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [panel]);

  const openAdd = () => {
    if (invoices.length === 0) {
      toastError("Create at least one invoice from the Invoices tab first.");
      return;
    }
    if (!skipResetOnOpenAddRef.current) {
      resetForm();
    }
    skipResetOnOpenAddRef.current = false;
    setPanel("add");
  };

  async function saveCreditNote() {
    let invId = invoiceId;
    if (!invId && skipRequiredFieldValidation() && invoices[0]) {
      invId = invoices[0].id;
    }
    if (!invId) {
      toastError("Select an invoice number.");
      return;
    }

    const inv = invoiceById.get(invId);
    if (!inv) {
      toastError("Invoice not found.");
      return;
    }

    const maxQty = invoiceLineQty(inv);
    let qr = Math.floor(parseInt(qtyToReturn, 10));
    if (!Number.isFinite(qr) || qr < 1) {
      if (skipRequiredFieldValidation()) qr = 1;
      else {
        toastError("Enter quantity to return (at least 1).");
        return;
      }
    }
    if (qr > maxQty) {
      toastError(`Quantity to return cannot exceed invoice quantity (${maxQty}).`);
      return;
    }

    let rawAmt = parseAmountInput(goodsReturnAmount);
    if (rawAmt <= 0 && skipRequiredFieldValidation()) {
      rawAmt = 0.01;
    }
    if (rawAmt <= 0) {
      toastError("Enter goods return amount.");
      return;
    }

    const roundedAmount = roundGoodsReturnAmount(rawAmt);
    if (roundedAmount <= 0) {
      toastError("Goods return amount is too small after rounding.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return toastError("You must be signed in.");
    }

    const payload = {
      user_id: user.id,
      invoice_id: invId,
      return_date: creditDate || todayISODate(),
      amount: roundedAmount,
      quantity_returned: qr,
      note: null as string | null,
    };

    const { data, error } = await supabase.from("invoice_goods_returns").insert(payload).select().single();

    if (error) {
      setSaving(false);
      if (error.message.includes("quantity_returned") || error.code === "PGRST204") {
        return toastError(
          "Database is missing column quantity_returned. Apply the migration in supabase/migrations/ then try again."
        );
      }
      return toastError(error.message);
    }

    setReturns((prev) => [data as InvoiceGoodsReturnRow, ...prev]);
    setSaving(false);
    requestClose();
    toastSuccess("Credit note saved.");
    router.refresh();
  }

  const sortedReturns = useMemo(
    () =>
      [...returns].sort((a, b) => {
        const da = (b.return_date || "").localeCompare(a.return_date || "");
        if (da !== 0) return da;
        return (b.created_at || "").localeCompare(a.created_at || "");
      }),
    [returns]
  );

  const totals = useMemo(() => {
    let sum = 0;
    for (const r of returns) {
      sum += roundGoodsReturnAmount(Number(r.amount ?? 0));
    }
    return { count: returns.length, sum };
  }, [returns]);

  const panelTitle = "Add credit note";

  return (
    <div
      className="relative -mx-4 -mt-5 flex min-h-[calc(100dvh-7.5rem)] flex-col bg-[#12141D] px-4 pb-28 pt-3 text-zinc-100 md:mx-0 md:mt-0 md:min-h-[70vh] md:rounded-2xl md:border md:border-zinc-800/80 md:pb-10 md:pt-6"
      style={{ backgroundColor: CANVAS }}
    >
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-700" aria-hidden />
              <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Credit notes</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-400">
              Add new credit notes here (tap +). To change an existing credit note, open the company or retailer, edit the invoice, and use the Credit tab.
            </p>
          </div>
          {sortedReturns.length > 0 && invoices.length > 0 ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-100/90">
              <CreditNoteDocGlyph className="h-3.5 w-3.5 opacity-90" />
              {totals.count} credit note{totals.count === 1 ? "" : "s"}
              <span className="text-zinc-500">·</span>
              <span className="font-mono tabular-nums">{formatInr(totals.sum)}</span>
            </span>
          ) : null}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">Setup required</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Create at least one invoice from the Invoices tab before you can add a credit note.
          </p>
        </div>
      ) : sortedReturns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">No credit notes yet</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">Tap + to add a credit note.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 px-5 py-3 text-sm font-semibold text-amber-950 shadow-[0_4px_20px_rgba(251,191,36,0.28)] transition hover:from-amber-100 hover:to-amber-50"
          >
            Add your first credit note
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortedReturns.map((r) => {
            const inv = invoiceById.get(r.invoice_id);
            const invNo = inv?.invoice_number ?? "—";
            const qr = Math.max(1, Math.floor(Number(r.quantity_returned ?? 1)));
            const amt = roundGoodsReturnAmount(Number(r.amount ?? 0));
            return (
              <li key={r.id}>
                <div className="flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/95 to-zinc-900/50 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.03]">
                  <span
                    className="w-1.5 shrink-0 bg-gradient-to-b from-amber-400/90 to-amber-700/80"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-3 pr-4 sm:gap-4 sm:pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[15px] font-semibold tracking-tight text-white sm:text-base">
                        {invNo}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {(r.return_date || "").slice(0, 10)}
                        <span className="text-zinc-600"> · </span>
                        Qty returned {qr}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-sm font-semibold tabular-nums tracking-tight text-amber-200 sm:text-[15px]">
                        {formatInr(amt)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Return</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {invoices.length > 0 ? (
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-amber-950 shadow-[0_8px_32px_rgba(251,191,36,0.35),0_2px_8px_rgba(0,0,0,0.4)] ring-2 ring-[#101014] transition hover:scale-105 hover:from-amber-100 hover:to-amber-50 active:scale-95 md:bottom-10 md:right-10"
          aria-label="Add credit note"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      {panel !== "closed" && (
        <>
          <button
            type="button"
            aria-label="Close"
            className={`fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300 ${
              sheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => !saving && requestClose()}
          />
          <div
            className={`fixed inset-0 z-[101] flex min-h-0 flex-col border-zinc-700/90 bg-[#16181f] pt-[env(safe-area-inset-top)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform max-md:rounded-t-3xl max-md:border max-md:border-b-0 md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border md:border-l md:border-t-0 md:pt-0 md:shadow-[-12px_0_40px_rgba(0,0,0,0.45)] ${
              sheetOpen
                ? "pointer-events-auto translate-y-0 md:translate-x-0"
                : "pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-note-sheet-title"
            onTransitionEnd={handleSheetTransitionEnd}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 md:hidden" aria-hidden />
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/80 bg-gradient-to-b from-[#181a22] to-[#16181f] px-4 py-3.5">
              <button
                type="button"
                onClick={() => requestClose()}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Back"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2
                id="credit-note-sheet-title"
                className="flex-1 truncate text-center text-lg font-semibold text-white md:text-left"
              >
                {panelTitle}
              </h2>
              <button
                type="button"
                onClick={() => !saving && requestClose()}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white md:ml-auto"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-32">
              <form
                id="credit-note-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveCreditNote();
                }}
                className="space-y-4"
              >
                <div>
                  <label className={labelDark} htmlFor="cn-invoice">
                    Invoice number
                  </label>
                  <SearchableDropdown
                    id="cn-invoice"
                    value={invoiceId}
                    onChange={(id) => {
                      setInvoiceId(id);
                      if (id) setQtyToReturn("1");
                    }}
                    options={invoiceSelectOptions}
                    placeholder="Select invoice number"
                    searchPlaceholder="Search invoice…"
                    disabled={saving}
                    inputBackground={INPUT_BG}
                    menuZIndex={400}
                  />
                </div>

                <div>
                  <label className={labelDark}>Date</label>
                  <DatePicker value={creditDate} onChange={setCreditDate} disabled={saving} className={fieldClassDark()} />
                </div>

                <div>
                  <label className={labelDark}>No. of qty (on invoice)</label>
                  <input
                    type="text"
                    readOnly
                    className={`${fieldClassDark()} cursor-not-allowed opacity-80`}
                    style={inputStyle}
                    value={invoiceQty !== null ? String(invoiceQty) : "—"}
                    aria-live="polite"
                  />
                  <p className="mt-1 text-xs text-zinc-500">From the selected invoice.</p>
                </div>

                <div>
                  <label className={labelDark} htmlFor="cn-qty-return">
                    No. of qty to be returned
                  </label>
                  <input
                    id="cn-qty-return"
                    type="number"
                    min={1}
                    max={invoiceQty ?? undefined}
                    inputMode="numeric"
                    className={fieldClassDark()}
                    style={inputStyle}
                    value={qtyToReturn}
                    onChange={(e) => setQtyToReturn(e.target.value)}
                    disabled={saving || !selectedInvoice}
                    placeholder="1"
                  />
                  {invoiceQty !== null && (
                    <p className="mt-1 text-xs text-zinc-500">Maximum {invoiceQty}.</p>
                  )}
                </div>

                <div>
                  <label className={labelDark} htmlFor="cn-amount">
                    Goods return amount
                  </label>
                  <input
                    id="cn-amount"
                    type="text"
                    inputMode="decimal"
                    className={fieldClassDark()}
                    style={inputStyle}
                    value={goodsReturnAmount}
                    onChange={(e) => setGoodsReturnAmount(e.target.value)}
                    disabled={saving}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Rounded to two decimal places when saved.</p>
                </div>
              </form>
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => requestClose()}
                  className="min-h-[48px] flex-1 rounded-xl border border-white/20 bg-transparent py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="credit-note-form"
                  disabled={saving}
                  className="min-h-[48px] flex-[1.15] rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 py-3 text-sm font-semibold text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:from-amber-100 hover:to-amber-50 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save credit note"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
