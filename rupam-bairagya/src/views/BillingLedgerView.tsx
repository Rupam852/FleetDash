import React, { useState, useMemo } from "react";
import { Invoice, Tenant } from "../types/index.js";
import {
  Plus,
  ShieldCheck,
  ReceiptText,
  Search,
  Download,
  ChevronRight,
  Zap,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../services/api.js";
import { InvoiceDetailDrawer } from "../components/InvoiceDetailDrawer.js";
import { RollbackVisualizerModal } from "../components/RollbackVisualizerModal.js";
import { PremiumSelect } from "../components/PremiumSelect.js";
import {
  DEFAULT_HOME_STATE,
  GSTIN_STATE_CODE_MAP,
  computeGstSplit,
  getPlaceOfSupplyOptions,
  normalizeHomeState,
} from "../utils/gstStates.js";

interface BillingLedgerViewProps {
  invoices: Invoice[];
  currentTenant: string;
  tenants?: Tenant[];
  onRefresh: () => void;
}

export const BillingLedgerView: React.FC<BillingLedgerViewProps> = ({
  invoices,
  currentTenant,
  tenants = [],
  onRefresh,
}) => {
  const currentTenantObj = tenants.find(
    (t) => t.tenantId.toLowerCase() === currentTenant.toLowerCase()
  );
  const currentTenantName =
    currentTenantObj?.name ||
    (currentTenant === "acme_corp"
      ? "AI HUB"
      : currentTenant.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  const currentHomeState = normalizeHomeState(currentTenantObj?.homeState || DEFAULT_HOME_STATE);
  const placeOfSupplyOptions = useMemo(
    () => getPlaceOfSupplyOptions(currentHomeState),
    [currentHomeState]
  );
  const isSuspended = currentTenantObj?.status === "SUSPENDED";
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState<boolean>(false);

  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>("");
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("");
  const [isGstEnabled, setIsGstEnabled] = useState<boolean>(true);
  const [showGstDetails, setShowGstDetails] = useState<boolean>(false);

  // Indian GST state code mapping from first 2 digits of GSTIN
  const handleGstinChange = (value: string) => {
    const uppercase = value.toUpperCase();
    setCustomerGstin(uppercase);
    if (uppercase.length >= 2) {
      const stateCode = uppercase.slice(0, 2);
      if (GSTIN_STATE_CODE_MAP[stateCode]) {
        setPlaceOfSupply(GSTIN_STATE_CODE_MAP[stateCode]);
      }
    }
  };

  // Search & Filter pipeline
  const filtered = invoices.filter((i) => {
    const matchesFilter = filter === "ALL" ? true : i.status === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.customerEmail.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.idempotencyKey.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || Number(amountInput) <= 0) return;

    setIsCharging(true);
    try {
      const unitRate = parseFloat(amountInput) || 0;
      const qty = Math.max(1, parseInt(quantityInput) || 1);
      const totalTaxable = unitRate * qty;
      const amountCents = Math.round(totalTaxable * 100);
      const unitPriceCents = Math.round(unitRate * 100);

      await apiClient.post("/billing/charge", {
        idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        amountCents,
        quantity: qty,
        unitPriceCents,
        customerId: `cust_${currentTenant || "default"}`,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || `finance@${currentTenant || "tenant"}.io`,
        customerGstin: isGstEnabled && customerGstin.trim() ? customerGstin.trim().toUpperCase() : undefined,
        billingAddress: billingAddress.trim() || undefined,
        placeOfSupply: isGstEnabled && showGstDetails && placeOfSupply ? placeOfSupply : undefined,
        sacCode: isGstEnabled ? "998313" : undefined,
        isGstApplicable: isGstEnabled,
        description: descriptionInput.trim() ? descriptionInput.trim() : "N/A",
      });

      setAmountInput("");
      setQuantityInput("1");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerGstin("");
      setBillingAddress("");
      setDescriptionInput("");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCharging(false);
    }
  };

  const handleExportCsv = () => {
    if (invoices.length === 0) return;

    const headers = [
      "Invoice Number",
      "Date & Time",
      "Workspace Name",
      "Customer Name",
      "Customer Email",
      "Customer GSTIN",
      "Place of Supply",
      "Description",
      "Unit Price (INR)",
      "Qty",
      "Base Amount (INR)",
      "GST Rate (%)",
      "GST Amount (INR)",
      "Grand Total (INR)",
      "Payment Status",
      "Rollback Reason",
      "Idempotency Key",
      "Transaction ID",
      "RSA-256 Digital Signature",
    ];

    const rows = invoices.map((inv) => {
      const isGst = inv.isGstApplicable !== false;
      const base = inv.amountCents / 100;
      const qty = inv.quantity || 1;
      const unitPrice = inv.unitPriceCents ? inv.unitPriceCents / 100 : base / qty;
      const gstRate = isGst ? (inv.gstRate ?? 18) : 0;
      const gstAmount = isGst ? (base * gstRate) / 100 : 0;
      const grandTotal = base + gstAmount;
      const formattedDate = new Date(inv.timestamp).toLocaleString("en-IN");

      return [
        inv.invoiceNumber,
        `"${formattedDate}"`,
        `"${(currentTenantName || currentTenant).replace(/"/g, '""')}"`,
        `"${(inv.customerName || "-").replace(/"/g, '""')}"`,
        `"${(inv.customerEmail || "-").replace(/"/g, '""')}"`,
        `"${(inv.customerGstin || "N/A").replace(/"/g, '""')}"`,
        `"${(inv.placeOfSupply || "Not Specified").replace(/"/g, '""')}"`,
        `"${(inv.description || "").replace(/"/g, '""')}"`,
        unitPrice.toFixed(2),
        qty,
        base.toFixed(2),
        `${gstRate}%`,
        gstAmount.toFixed(2),
        grandTotal.toFixed(2),
        inv.status,
        `"${(inv.rollbackReason || "-").replace(/"/g, '""')}"`,
        inv.idempotencyKey,
        inv.transactionId,
        `"${inv.rsaSignature || "N/A"}"`,
      ];
    });

    // \uFEFF enables proper UTF-8 handling in Microsoft Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${(currentTenantName || currentTenant).toLowerCase().replace(/\s+/g, "_")}_invoices_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4">
        <div className="min-w-0 xl:flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Invoices & Billing Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
            Idempotent multi-document ACID transactions mapped across isolated database:{" "}
            <span className="text-blue-600 dark:text-blue-400 font-semibold">ledgerguard_{currentTenant || "default"}</span>
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center xl:justify-end gap-2 shrink-0">
          <button
            onClick={() => setIsRollbackModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-semibold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Simulate ACID Rollback</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={invoices.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#1E293B] disabled:opacity-40 text-xs text-slate-700 dark:text-slate-200 font-medium transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Export CSV</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-lg border border-slate-200 dark:border-slate-700/80 shrink-0">
            {["ALL", "COMMITTED", "ROLLED_BACK"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  filter === tab
                    ? "bg-white dark:bg-[#0F172A] text-blue-700 dark:text-blue-400 shadow-2xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab === "ROLLED_BACK" ? "ROLLED BACK" : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Ledger Table */}
        <div className="lg:col-span-2 min-w-0 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div>
            {/* Filter & Live Search Toolbar */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-slate-50/60 dark:bg-[#1E293B]/40">
              <div className="relative w-full sm:flex-1 sm:max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by invoice #, email, or key..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Double-Checked Lock Verified
              </span>
            </div>

            {/* Invoices List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[420px] lg:max-h-[500px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-10 sm:p-12 text-center space-y-2">
                  <ReceiptText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {searchQuery ? "No matching records found" : "No transactions recorded yet"}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {searchQuery ? "Try searching by a different term" : "Create an idempotent charge using the form."}
                  </div>
                </div>
              ) : (
                filtered.map((inv) => (
                  <div
                    key={inv.invoiceNumber}
                    onClick={() => setSelectedInvoice(inv)}
                    className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-[#1E293B]/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {inv.invoiceNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                            inv.status === "ROLLED_BACK"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 break-words">{inv.description}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 break-all sm:break-words">
                        Key: {inv.idempotencyKey} | Email: {inv.customerEmail}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 shrink-0">
                      {(() => {
                        const isGst = inv.isGstApplicable !== false;
                        const grandTotal = isGst ? (inv.amountCents * 1.18) / 100 : inv.amountCents / 100;
                        return (
                          <div className="text-left sm:text-right space-y-0.5">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums font-medium">
                              {inv.quantity && inv.quantity > 1 ? `Qty: ${inv.quantity} • ` : ""}
                              {isGst
                                ? `Base: ₹${(inv.amountCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (+18% GST)`
                                : `Base: ₹${(inv.amountCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Non-GST)`}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })()}
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 dark:bg-[#1E293B]/40 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-medium">
            <span>Showing {filtered.length} of {invoices.length} transactions</span>
            <span>Click any record to inspect audit details</span>
          </div>
        </div>

        {/* Quick Charge Account Trigger */}
        <div className="min-w-0 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm h-fit">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Idempotent Charge</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Executes under distributed Redlock and ACID transactional guarantee</p>
          </div>

          {isSuspended && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Workspace is Suspended</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                This workspace has been temporarily paused. New charges and API billing calls are blocked until reactivated by an admin.
              </p>
            </div>
          )}

          <form onSubmit={handleCreateCharge} className="space-y-3">
            {/* GST On/Off Checkbox Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700">
              <label htmlFor="gst-toggle" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="gst-toggle"
                  checked={isGstEnabled}
                  onChange={(e) => setIsGstEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Apply GST (+18%)</span>
              </label>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono ${isGstEnabled ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"}`}>
                {isGstEnabled ? "18% GST ON" : "NON-GST (0%)"}
              </span>
            </div>

            {/* Rate & Quantity Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
                  {isGstEnabled ? "Unit Rate (₹ INR)" : "Unit Price (₹ INR)"}
                </label>
                <input
                  type="number"
                  placeholder="5000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1 text-center">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-slate-100 text-center font-semibold focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            {Number(amountInput) > 0 && (() => {
              const taxableTotal = Number(amountInput) * (Number(quantityInput) || 1);
              const split = computeGstSplit(
                taxableTotal,
                isGstEnabled,
                undefined,
                currentHomeState,
                showGstDetails && placeOfSupply ? placeOfSupply : undefined
              );
              return (
                <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 space-y-1 font-medium animate-fade-in">
                  {Number(quantityInput) > 1 && (
                    <div className="text-slate-600 dark:text-slate-300 flex justify-between pb-0.5 border-b border-blue-100 dark:border-blue-800/50">
                      <span>Taxable Rate × Qty:</span>
                      <span>₹{Number(amountInput).toLocaleString("en-IN")} × {quantityInput} = <strong>₹{taxableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-between items-center gap-1 pt-0.5">
                    {isGstEnabled ? (
                      <>
                        {split.mode === "INTRA_STATE" ? (
                          <span>
                            CGST 9% + SGST 9%:{" "}
                            <strong>
                              ₹{split.cgstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })} + ₹{split.sgstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                        ) : split.mode === "INTER_STATE" ? (
                          <span>
                            +18% IGST:{" "}
                            <strong>₹{split.igstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                          </span>
                        ) : (
                          <span>
                            +18% GST:{" "}
                            <strong>₹{split.totalGstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                          </span>
                        )}
                        <span>
                          Total:{" "}
                          <strong className="text-blue-700 dark:text-blue-400 text-xs">
                            ₹{(taxableTotal + split.totalGstRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-600 dark:text-slate-400">Tax: <strong>₹0.00 (Exempt)</strong></span>
                        <span>Total: <strong className="text-slate-900 dark:text-slate-100 text-xs">₹{taxableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Company / Customer Name</label>
              <input
                type="text"
                placeholder="NovaTech Solutions Pvt Ltd"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Customer Email</label>
              <input
                type="email"
                placeholder="billing@customer.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Description</label>
              <input
                type="text"
                placeholder="Dedicated Compute Tier"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Collapsible Tax / Customer Details (Adaptive based on GST toggle) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowGstDetails(!showGstDetails)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                  isGstEnabled
                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/40"
                    : "bg-slate-100/80 dark:bg-[#1E293B]/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isGstEnabled ? (
                    <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  )}
                  <span>
                    {isGstEnabled
                      ? "GST & Tax Invoice Options (18%)"
                      : "Optional Customer Address (Non-GST)"}
                  </span>
                </div>
                {showGstDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showGstDetails && (
                <div className="mt-2.5 p-3.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 animate-fade-in text-xs">
                  {isGstEnabled ? (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">
                          Customer GSTIN (15-digit Tax ID)
                        </label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="27AAPFU0939F1ZV"
                          value={customerGstin}
                          onChange={(e) => handleGstinChange(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label
                            htmlFor="place-of-supply-select"
                            className="text-[11px] text-slate-600 dark:text-slate-400 font-medium"
                          >
                            Place of Supply / State
                          </label>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]" title={`Workspace Origin: ${currentHomeState}`}>
                            Origin: {currentHomeState}
                          </span>
                        </div>
                        <PremiumSelect
                          id="place-of-supply-select"
                          value={placeOfSupply}
                          onChange={setPlaceOfSupply}
                          options={placeOfSupplyOptions}
                          placeholder="-- Select State --"
                          searchPlaceholder="Search state or GST code..."
                          searchable
                          clearable
                          clearAriaLabel="Clear selected state"
                          size="sm"
                          menuClassName="left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[300px]"
                          icon={<MapPin className="w-3.5 h-3.5" />}
                          emptyMessage="No matching state found"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">
                          Registered Billing Address
                        </label>
                        <input
                          type="text"
                          placeholder="B-Wing, Tech Park / Office Address"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="text-[10.5px] text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>SAC Code: <strong className="text-slate-700 dark:text-slate-200">998313</strong></span>
                        <span>GST Rate: <strong className="text-slate-700 dark:text-slate-200">18.00%</strong></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">
                          Customer Billing Address (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="B-Wing, Tech Park / Office Address"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Commercial Non-GST Mode</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-300 dark:border-slate-700">
                          0.00% Tax
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              disabled={isCharging || isSuspended}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm mt-4 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isSuspended
                  ? "Workspace Suspended (Billing Paused)"
                  : isCharging
                  ? "Acquiring Lock..."
                  : "Charge Client Atomically"}
              </span>
            </button>
          </form>

          <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300">Strict Idempotency:</div>
            <div>Redis distributed lock ensures requests with the same key are never double-billed.</div>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        currentTenant={currentTenant}
        tenantName={currentTenantName}
        tenantHomeState={currentHomeState}
        onClose={() => setSelectedInvoice(null)}
        onDeleteSuccess={onRefresh}
      />

      {/* Interactive ACID Rollback Visualizer Modal */}
      <RollbackVisualizerModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        currentTenant={currentTenant}
        tenantName={currentTenantName}
        onRollbackComplete={onRefresh}
      />
    </div>
  );
};
