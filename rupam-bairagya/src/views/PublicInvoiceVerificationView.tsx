import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Search,
  ReceiptText,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { apiClient } from "../services/api.js";
import { ThemeToggle } from "../components/ThemeToggle.js";
import { PublicVerificationResponse } from "../types/index.js";
import { getApiErrorMessage } from "../utils/errors.js";

interface PublicInvoiceVerificationViewProps {
  initialInvoiceNumber?: string;
  onBackToLogin: () => void;
}

export const PublicInvoiceVerificationView: React.FC<PublicInvoiceVerificationViewProps> = ({
  initialInvoiceNumber = "",
  onBackToLogin,
}) => {
  const [invoiceInput, setInvoiceInput] = useState<string>(initialInvoiceNumber);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verifiedData, setVerifiedData] = useState<PublicVerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copiedSig, setCopiedSig] = useState<boolean>(false);

  const performVerification = async (invNumber: string) => {
    const cleanNum = invNumber.trim();
    if (!cleanNum) return;

    setIsLoading(true);
    setErrorMsg("");
    setVerifiedData(null);

    try {
      const res = await apiClient.get(`/billing/public/verify/${cleanNum}`);
      if (res.data && res.data.isAuthentic) {
        setVerifiedData(res.data);
      } else {
        setErrorMsg("Invoice could not be verified in the master ledger.");
      }
    } catch (err: unknown) {
      setErrorMsg(
        getApiErrorMessage(
          err,
          `Invoice '${cleanNum}' was not found in any registered workspace ledger. Please check the invoice number.`
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialInvoiceNumber) {
      performVerification(initialInvoiceNumber);
    }
  }, [initialInvoiceNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(invoiceInput);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  return (
    <div className="min-h-[100dvh] lg:min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative transition-colors duration-200">
      {/* Background Subtle Tech Dot Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sticky top-0 z-20 shadow-2xs transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="/logos/logo-concept-3-sentinel.svg"
            alt="LedgerGuard"
            className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 drop-shadow-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight shrink-0">LedgerGuard</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 font-mono font-semibold whitespace-nowrap shrink-0">
                VERIFIED PORTAL
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              Zero-Knowledge Cryptographic Invoice Verifier
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeToggle />

          <button
            onClick={onBackToLogin}
            className="px-2.5 sm:px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold transition flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap active:scale-95"
            title="Back to Enterprise Login"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Enterprise</span>
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 relative z-10">
        {/* Verification Search Bar */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-4 transition-colors">
          <div className="text-center max-w-lg mx-auto space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-1 border border-blue-100 dark:border-blue-900/60">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Verify Tax Invoice Authenticity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter any LedgerGuard invoice number or scan the QR code to verify its RSA-256 cryptographic seal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Invoice # (e.g. INV-2026-003350)"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono uppercase transition shadow-inner"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 shrink-0"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Bill</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300 text-xs animate-fade-in shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-red-900 dark:text-red-200">Verification Failed / Unregistered Invoice</div>
              <div className="text-red-700 dark:text-red-400 mt-0.5">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Verified Certificate Result */}
        {verifiedData && (
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg animate-fade-in transition-colors">
            {/* Certificate Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                    <span>Official Certified Verification</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
                    100% Genuine & Digitally Sealed
                  </h2>
                  <div className="text-[11px] text-emerald-100/90 font-medium truncate">
                    Verified on: {new Date(verifiedData.verifiedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-emerald-400/30 flex md:block items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-emerald-100/80 font-medium">
                    {verifiedData.invoice.isGstApplicable !== false ? "Grand Total (+18% GST):" : "Total Amount (Non-GST):"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
                    ₹{((verifiedData.invoice.isGstApplicable !== false ? verifiedData.invoice.amountCents * 1.18 : verifiedData.invoice.amountCents) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/25 text-white font-mono text-[10px] font-bold mt-1 shadow-2xs">
                  STATUS: {verifiedData.invoice.status}
                </span>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Left: Invoice & Parties Details */}
                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3.5 text-xs min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Transaction Details</span>
                  </h3>

                  <div className="space-y-2 text-slate-600 dark:text-slate-300 divide-y divide-slate-200/70 dark:divide-slate-800">
                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Invoice Number:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm text-right">{verifiedData.invoice.invoiceNumber}</span>
                    </div>

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Issuing Organization:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400 text-right min-w-0 break-words">{verifiedData.tenant.name} ({verifiedData.tenant.tenantId})</span>
                    </div>

                    {(verifiedData.invoice.sellerState || verifiedData.tenant.homeState) && (
                      <div className="flex justify-between gap-3 items-start pt-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Origin State (Seller):</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">
                          {verifiedData.invoice.sellerState || verifiedData.tenant.homeState}
                        </span>
                      </div>
                    )}

                    {verifiedData.invoice.placeOfSupply && (
                      <div className="flex justify-between gap-3 items-start pt-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Place of Supply:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">
                          {verifiedData.invoice.placeOfSupply}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Buyer Entity:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right min-w-0 break-words">{verifiedData.invoice.customerName || "N/A"}</span>
                    </div>

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Billed To Email:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-right min-w-0 break-all">{verifiedData.invoice.customerEmail}</span>
                    </div>

                    {verifiedData.invoice.billingAddress && (
                      <div className="flex justify-between gap-3 items-start pt-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Billing Address:</span>
                        <span className="text-right text-slate-800 dark:text-slate-200 max-w-[200px] truncate min-w-0" title={verifiedData.invoice.billingAddress}>
                          {verifiedData.invoice.billingAddress}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Description:</span>
                      <span className="text-slate-800 dark:text-slate-200 text-right min-w-0 break-words">{verifiedData.invoice.description || "N/A"}</span>
                    </div>

                    {verifiedData.invoice.quantity && verifiedData.invoice.quantity > 1 && (
                      <div className="flex justify-between gap-3 items-start pt-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Billed Quantity:</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400 text-right">{verifiedData.invoice.quantity} Units</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Taxable Base Rate:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right tabular-nums">
                        ₹{(verifiedData.invoice.amountCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">
                        {verifiedData.invoice.isGstApplicable !== false ? "Assessed Tax (+18% GST):" : "GST Status:"}
                      </span>
                      <span className={`font-semibold text-right tabular-nums ${verifiedData.invoice.isGstApplicable !== false ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {verifiedData.invoice.isGstApplicable !== false
                          ? `₹${((verifiedData.invoice.amountCents * 0.18) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "Exempt / Non-GST (₹0.00)"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-700 dark:text-slate-300 font-bold shrink-0">Grand Total Payable:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm text-right tabular-nums">
                        ₹{((verifiedData.invoice.isGstApplicable !== false ? verifiedData.invoice.amountCents * 1.18 : verifiedData.invoice.amountCents) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 items-start pt-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Issue Timestamp:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-right min-w-0">{new Date(verifiedData.invoice.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Cryptographic Seal & Distributed Verification */}
                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3.5 text-xs min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Cryptographic Audit Proof</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>RSA-256 Digital Signature:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(verifiedData.securitySeal.signature)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-semibold transition"
                        >
                          {copiedSig ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSig ? "Copied" : "Copy Signature"}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[10.5px] bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-indigo-300 break-all select-all font-semibold shadow-2xs">
                        {verifiedData.securitySeal.signature}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300 divide-y divide-slate-200/60 dark:divide-slate-800">
                      <div className="flex justify-between items-center gap-2 pt-1.5">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Signatory Authority:</span>
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[140px] sm:max-w-[220px] text-right" title={verifiedData.securitySeal.authority}>
                          {verifiedData.securitySeal.authority}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Algorithm:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">{verifiedData.securitySeal.algorithm}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Tamper-Proof Status:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{verifiedData.securitySeal.tamperProofStatus}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2 pt-1.5">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Tenant Vault:</span>
                        <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold truncate max-w-[150px] sm:max-w-none text-right">
                          Dedicated Atlas Partition (Isolated)
                        </span>
                      </div>

                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Concurrency Engine:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">Distributed ACID Redlock</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Verification Declaration */}
              <div className="p-3.5 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-[11.5px] text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-100">Official Non-Repudiation Certificate</div>
                  <div className="text-emerald-800 dark:text-emerald-300 leading-relaxed mt-0.5">
                    This invoice was generated under distributed ACID Redlock concurrency controls and sealed with
                    asymmetric RSA-256 cryptographic keys. The authenticity and ledger integrity are guaranteed by LedgerGuard.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
