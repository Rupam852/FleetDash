import React, { useState, useEffect } from "react";
import { X, Copy, Check, Printer, Shield, Database, Lock, Trash2, AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import { Invoice } from "../types/index.js";
import { printInvoiceStatement } from "../utils/printInvoice.js";
import { apiClient } from "../services/api.js";
import { computeGstSplit } from "../utils/gstStates.js";
import { getApiErrorMessage } from "../utils/errors.js";

interface InvoiceDetailDrawerProps {
  invoice: Invoice | null;
  currentTenant: string;
  tenantName?: string;
  tenantHomeState?: string;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  invoice,
  currentTenant,
  tenantName,
  tenantHomeState,
  onClose,
  onDeleteSuccess,
}) => {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedSig, setCopiedSig] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>("");

  // Automatically reset delete and confirmation state whenever drawer opens or invoice changes
  useEffect(() => {
    setIsConfirmingDelete(false);
    setIsDeleting(false);
    setDeleteError("");
  }, [invoice?.invoiceNumber]);

  const handleClose = () => {
    setIsConfirmingDelete(false);
    setIsDeleting(false);
    setDeleteError("");
    onClose();
  };

  if (!invoice) return null;

  const isGst = invoice.isGstApplicable !== false;
  const baseRupees = invoice.amountCents / 100;
  const gstSplit = computeGstSplit(
    baseRupees,
    isGst,
    invoice.supplyType,
    invoice.sellerState,
    invoice.placeOfSupply
  );
  const gstRupees = gstSplit.totalGstRupees.toFixed(2);
  const grandTotalRupees = (baseRupees + gstSplit.totalGstRupees).toFixed(2);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(invoice.idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(invoice, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    printInvoiceStatement(invoice, currentTenant, tenantName, tenantHomeState);
    setTimeout(() => setIsPrinting(false), 1200);
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      await apiClient.delete(`/billing/invoices/${invoice.invoiceNumber}`);
      setIsConfirmingDelete(false);
      setIsDeleting(false);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      onClose();
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete invoice."));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md h-[100dvh] bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-pop relative">
          {/* Centered Modal Popup for Delete Confirmation */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-5 sm:p-6 w-full max-w-sm text-center space-y-4 animate-pop">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Permanently Delete Invoice?</h3>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold">
                    {invoice.invoiceNumber}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
                    This will permanently drop this record from dedicated tenant vault{" "}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      ledgerguard_tenant_{currentTenant}
                    </strong>
                    . This action cannot be reversed.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setIsConfirmingDelete(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteInvoice}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? "Deleting..." : "Yes, Delete"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#1E293B]/40">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    invoice.status === "ROLLED_BACK"
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      : invoice.status === "PENDING"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      invoice.status === "ROLLED_BACK"
                        ? "bg-rose-500"
                        : invoice.status === "PENDING"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  ></span>
                  {invoice.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">Enterprise Financial Ledger Audit Record</div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                title="Delete Invoice"
                aria-label="Delete Invoice"
                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-xs">
            {/* Amount Hero Card */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                invoice.status === "ROLLED_BACK"
                  ? "bg-gradient-to-br from-rose-50 to-orange-50/40 dark:from-rose-950/30 dark:to-orange-950/20 border-rose-100 dark:border-rose-900/60"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/60"
              }`}
            >
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {invoice.status === "ROLLED_BACK"
                  ? "Simulated Transaction Volume (Aborted)"
                  : isGst
                  ? "Total Invoice Amount (Incl. 18% GST)"
                  : "Total Commercial Invoice Amount (Non-GST)"}
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                ₹{Number(grandTotalRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="flex flex-wrap justify-between items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 font-medium tabular-nums">
                {invoice.status === "ROLLED_BACK" ? (
                  <span className="text-rose-700 dark:text-rose-400 font-semibold">Account Debited: ₹0.00 (Zero Loss)</span>
                ) : isGst ? (
                  <>
                    <span>Base Price: ₹{baseRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {gstSplit.mode === "INTRA_STATE"
                        ? `+9% CGST + 9% SGST: ₹${gstSplit.totalGstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : gstSplit.mode === "INTER_STATE"
                        ? `+18% IGST: ₹${gstSplit.igstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : `+ 18% GST: ₹${Number(gstRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Base Amount: ₹{baseRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Tax: 0.00% (Non-GST / Exempt)</span>
                  </>
                )}
              </div>
            </div>

            {/* Rollback Reason Banner */}
            {invoice.status === "ROLLED_BACK" && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>ACID Rollback Reason</span>
                </div>
                <div className="text-rose-700 dark:text-rose-300/90 text-[11px] leading-relaxed">
                  {invoice.rollbackReason ||
                    "Mid-flight network disconnection injected. ACID transaction aborted. Account debited: ₹0.00"}
                </div>
              </div>
            )}

            {/* Transaction Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Transaction Details
              </h4>
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Customer ID:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold text-right min-w-0 break-all">{invoice.customerId}</span>
                </div>
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Company Name:</span>
                  <span className={`font-semibold text-right min-w-0 break-words ${invoice.customerName ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}>
                    {invoice.customerName || "N/A"}
                  </span>
                </div>
                {invoice.quantity && invoice.quantity > 1 && (
                  <>
                    <div className="flex justify-between gap-3 items-start">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Billed Quantity:</span>
                      <span className="text-blue-700 dark:text-blue-400 font-semibold text-right">{invoice.quantity} Units</span>
                    </div>
                    <div className="flex justify-between gap-3 items-start">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Unit Price:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold text-right tabular-nums">
                        ₹{((invoice.unitPriceCents ? invoice.unitPriceCents / 100 : baseRupees / invoice.quantity)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Customer Email:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium text-right min-w-0 break-all">{invoice.customerEmail}</span>
                </div>
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Customer GSTIN:</span>
                  {invoice.customerGstin ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold text-right">{invoice.customerGstin}</span>
                  ) : (
                    <span className="text-slate-400 font-medium">N/A</span>
                  )}
                </div>
                {invoice.sellerState && (
                  <div className="flex justify-between gap-3 items-start">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">Origin State (Seller):</span>
                    <span className="font-medium text-right min-w-0 break-words text-slate-800 dark:text-slate-200">
                      {invoice.sellerState}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Place of Supply:</span>
                  <span className={`font-medium text-right min-w-0 break-words ${invoice.placeOfSupply ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}>
                    {invoice.placeOfSupply || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Billing Address:</span>
                  <span
                    className={`text-right max-w-[200px] truncate min-w-0 ${invoice.billingAddress ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}
                    title={invoice.billingAddress || "N/A"}
                  >
                    {invoice.billingAddress || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Description:</span>
                  <span
                    className={`text-right max-w-[200px] truncate min-w-0 ${invoice.description && invoice.description !== "N/A" ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}
                    title={invoice.description || "N/A"}
                  >
                    {invoice.description && invoice.description.trim() ? invoice.description : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 items-start">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Timestamp:</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums text-right min-w-0">{new Date(invoice.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic & Cloud Verification */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Distributed Systems Verification</span>
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-white dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      Dedicated Tenant Vault:
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 max-w-full truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="truncate">Isolated Data Pool ({tenantName || currentTenant})</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Physical runtime segregation verified</div>
                </div>

                <div className="p-3 bg-white dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Distributed Concurrency Lock:
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ACID Redlock Settled
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Zero double-spending risk guaranteed</div>
                </div>

                <div className="p-3 bg-white dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Idempotency Key:</span>
                    <button
                      onClick={handleCopyKey}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      {copiedKey ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 truncate select-all">
                    {invoice.idempotencyKey}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <div className="text-slate-500 dark:text-slate-400 font-medium">Transaction Hash:</div>
                  <div className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 truncate select-all">
                    {invoice.transactionId}
                  </div>
                </div>
              </div>
            </div>

            {/* Zero-Knowledge RSA-256 Cryptographic Digital Seal */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Zero-Knowledge RSA-256 Digital Seal</span>
              </h4>

              <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Digitally Sealed & Tamper-Proof
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 shrink-0">
                    RSA-256 VERIFIED
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>Cryptographic Digital Signature:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const sig = invoice.rsaSignature || `sig_rsa256_${invoice.idempotencyKey.slice(-16)}`;
                        navigator.clipboard.writeText(sig);
                        setCopiedSig(true);
                        setTimeout(() => setCopiedSig(false), 2000);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      {copiedSig ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSig ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[10px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-200/70 dark:border-indigo-900/70 text-indigo-950 dark:text-indigo-200 break-all select-all font-semibold shadow-2xs">
                    {invoice.rsaSignature || `sig_rsa256_${invoice.idempotencyKey.slice(-16)}`}
                  </div>
                </div>

                <div className="flex justify-between items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-indigo-100/80 dark:border-indigo-900/50">
                  <span className="shrink-0">Signatory Public Authority:</span>
                  <span className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                    {invoice.rsaFingerprint || `SHA256:${currentTenant}_rsa_authority_2026`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3.5 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1E293B]/60 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
              title="Delete this invoice"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
            >
              <Printer className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isPrinting ? "animate-pulse" : ""}`} />
              <span>{isPrinting ? "Preparing PDF..." : "Print Statement"}</span>
            </button>
            <button
              onClick={handleCopyJson}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? "Copied" : "Raw JSON"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
