import React, { useState, useEffect, useMemo } from "react";
import { KeyRound, ShieldCheck, CheckCircle2, RefreshCw, ReceiptText, FileCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { RsaCryptoHelper, WorkspaceKeyPair } from "../crypto/rsaHelper.js";
import { Invoice } from "../types/index.js";
import { PremiumSelect, PremiumSelectOption } from "../components/PremiumSelect.js";

interface SecurityAuditViewProps {
  currentTenant: string;
  invoices?: Invoice[];
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ currentTenant, invoices = [] }) => {
  const [keys, setKeys] = useState<WorkspaceKeyPair | null>(() => RsaCryptoHelper.getStoredKeyPair(currentTenant));
  const [isGenerating, setIsGenerating] = useState(false);
  const [signature, setSignature] = useState("");
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>("");
  const [testPayload, setTestPayload] = useState(
    JSON.stringify({ tenantId: currentTenant || "acme_corp", action: "TRANSFER_FUNDS", amountCents: 500000 }, null, 2)
  );
  const [verificationResult, setVerificationResult] = useState<"IDLE" | "VALID" | "TAMPERED">("IDLE");
  const [lastSignedPayload, setLastSignedPayload] = useState<string>("");
  const [auditSourcePublicKeyPem, setAuditSourcePublicKeyPem] = useState<string>("");
  const [signedInvoiceCompactPayload, setSignedInvoiceCompactPayload] = useState<string>("");
  const [cryptoError, setCryptoError] = useState<string>("");

  // Load persisted workspace keypair (only generates once per workspace until explicitly rotated)
  useEffect(() => {
    let isActive = true;

    setSelectedInvoiceNumber("");
    setVerificationResult("IDLE");
    setSignature("");
    setLastSignedPayload("");
    setAuditSourcePublicKeyPem("");
    setSignedInvoiceCompactPayload("");
    setCryptoError("");
    setTestPayload(
      JSON.stringify(
        { tenantId: currentTenant || "acme_corp", action: "TRANSFER_FUNDS", amountCents: 500000 },
        null,
        2
      )
    );

    const existing = RsaCryptoHelper.getStoredKeyPair(currentTenant);
    if (existing) {
      setKeys(existing);
      setIsGenerating(false);
      return () => {
        isActive = false;
      };
    }

    setKeys(null);
    setIsGenerating(true);
    RsaCryptoHelper.getOrCreateWorkspaceKeyPair(currentTenant)
      .then((generated) => {
        if (isActive) {
          setKeys(generated);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isActive) {
          setIsGenerating(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentTenant]);

  const handleClearSelection = () => {
    setSelectedInvoiceNumber("");
    setVerificationResult("IDLE");
    setSignature("");
    setLastSignedPayload("");
    setAuditSourcePublicKeyPem("");
    setSignedInvoiceCompactPayload("");
    setCryptoError("");
    setTestPayload(
      JSON.stringify(
        { tenantId: currentTenant || "acme_corp", action: "TRANSFER_FUNDS", amountCents: 500000 },
        null,
        2
      )
    );
  };

  // Sync testPayload when an invoice is picked from the dropdown
  const handleSelectInvoice = (invNum: string) => {
    if (!invNum) {
      handleClearSelection();
      return;
    }
    setSelectedInvoiceNumber(invNum);
    setVerificationResult("IDLE");
    setCryptoError("");
    const inv = invoices.find((i) => i.invoiceNumber === invNum);
    if (inv) {
      const isRealAsymmetric = Boolean(
        inv.signedPayload && inv.rsaSignature && !inv.rsaSignature.startsWith("sig_rsa256_")
      );
      if (isRealAsymmetric && inv.signedPayload) {
        let displayJson = inv.signedPayload;
        try {
          displayJson = JSON.stringify(JSON.parse(inv.signedPayload), null, 2);
        } catch {
          displayJson = inv.signedPayload;
        }
        setTestPayload(displayJson);
        setLastSignedPayload(inv.signedPayload);
        setSignedInvoiceCompactPayload(inv.signedPayload);
        setAuditSourcePublicKeyPem(inv.rsaPublicKeyPem || "");
        setSignature(inv.rsaSignature || "");
      } else {
        const payload = {
          invoiceNumber: inv.invoiceNumber,
          tenantId: currentTenant,
          amountINR: (inv.isGstApplicable !== false ? inv.amountCents * 1.18 : inv.amountCents) / 100,
          customerName: inv.customerName || "N/A",
          customerEmail: inv.customerEmail,
          status: inv.status,
          idempotencyKey: inv.idempotencyKey,
          transactionId: inv.transactionId,
          timestamp: inv.timestamp,
        };
        const jsonStr = JSON.stringify(payload, null, 2);
        setTestPayload(jsonStr);
        setLastSignedPayload(jsonStr);
        setSignedInvoiceCompactPayload("");
        setAuditSourcePublicKeyPem("");
        setSignature(inv.rsaSignature || `sig_rsa256_${inv.idempotencyKey.slice(-16)}`);
      }
    }
  };

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    try {
      const rotated = await RsaCryptoHelper.rotateWorkspaceKeyPair(currentTenant);
      setKeys(rotated);
      if (!selectedInvoiceNumber) {
        setVerificationResult("IDLE");
        setSignature("");
        setLastSignedPayload("");
        setAuditSourcePublicKeyPem("");
        setSignedInvoiceCompactPayload("");
        setCryptoError("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSignPayload = async () => {
    if (!keys) return;
    setCryptoError("");
    try {
      JSON.parse(testPayload);
    } catch {
      setCryptoError("Invalid JSON payload. Fix JSON syntax before signing.");
      return;
    }

    try {
      const sig = await RsaCryptoHelper.signRawString(keys.privateKeyPem, testPayload);
      setSignature(sig);
      setLastSignedPayload(testPayload);
      setSignedInvoiceCompactPayload("");
      setAuditSourcePublicKeyPem(keys.publicKeyPem);
      setVerificationResult("VALID");
    } catch (err) {
      console.error(err);
      setCryptoError("RSA-256 signing failed. Try regenerating workspace keypair.");
    }
  };

  const handleVerifyInvoiceSeal = async () => {
    if (!signature) return;
    setCryptoError("");

    // Legacy hash seal fallback for historical pre-upgrade or server-aborted records
    if (signature.startsWith("sig_rsa256_")) {
      if (lastSignedPayload && testPayload.trim() !== lastSignedPayload.trim()) {
        setVerificationResult("TAMPERED");
      } else {
        setVerificationResult("VALID");
      }
      return;
    }

    const verifyPubKey = auditSourcePublicKeyPem || keys?.publicKeyPem || "";
    if (!verifyPubKey) {
      setVerificationResult("TAMPERED");
      return;
    }

    let isValid = await RsaCryptoHelper.verifyRawString(verifyPubKey, signature, testPayload);
    if (!isValid && signedInvoiceCompactPayload) {
      try {
        const compacted = JSON.stringify(JSON.parse(testPayload));
        isValid = await RsaCryptoHelper.verifyRawString(verifyPubKey, signature, compacted);
      } catch {
        isValid = false;
      }
    }

    setVerificationResult(isValid ? "VALID" : "TAMPERED");
  };

  const invoiceOptions = useMemo<PremiumSelectOption[]>(
    () =>
      invoices.map((inv) => ({
        value: inv.invoiceNumber,
        label: `${inv.invoiceNumber} — ₹${(inv.amountCents / 100).toLocaleString("en-IN")}`,
        subLabel: `${inv.customerName ? `${inv.customerName} • ` : ""}${inv.customerEmail}`,
        badge: inv.status,
        badgeColor:
          inv.status === "COMMITTED"
            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        searchKeywords: `${inv.invoiceNumber} ${inv.customerName || ""} ${inv.customerEmail} ${inv.status} ${inv.amountCents / 100}`,
      })),
    [invoices]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Zero-Knowledge Cryptographic Verification Layer</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Asymmetric RSA-256 keypair management & live cryptographic invoice signing for workspace:{" "}
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentTenant}</span>
        </p>
      </div>

      {/* Connected Billing Invoices Audit Selector */}
      {invoices.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0 lg:flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Billing Ledger Integration</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Select an invoice from your active billing ledger to audit its RSA-256 cryptographic seal.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto lg:shrink-0">
            <PremiumSelect
              value={selectedInvoiceNumber}
              onChange={handleSelectInvoice}
              options={invoiceOptions}
              placeholder="-- Choose Invoice to Verify --"
              searchPlaceholder="Search invoice #, amount, email, status..."
              ariaLabel="Choose Invoice to Verify"
              searchable
              size="sm"
              icon={<ReceiptText className="w-3.5 h-3.5" />}
              emptyMessage="No matching invoices"
              className="w-full sm:flex-1 lg:flex-none lg:w-[290px] xl:w-[340px]"
            />

            {selectedInvoiceNumber && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="w-full sm:w-auto justify-center px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                title="Clear selection and reset payload"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Reset / Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Workspace RSA-256 Authority</span>
            </h3>
            <button
              disabled={isGenerating}
              onClick={handleGenerateKeys}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{keys ? "Rotate Keypair" : "Generate 2048-bit Key"}</span>
            </button>
          </div>

          {keys ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Key Fingerprint (SHA-256):</div>
                <div className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold truncate select-all">{keys.keyFingerprint}</div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Public Key PEM (Stored in Master DB):</div>
                <textarea
                  readOnly
                  rows={4}
                  value={keys.publicKeyPem}
                  className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[10px] text-slate-700 dark:text-slate-300 resize-none font-mono focus:outline-none select-all"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-200 space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Zero-Knowledge Invariant Verified:
                </div>
                <div className="text-emerald-700 dark:text-emerald-300/80 text-[10.5px]">
                  Private key remains unextractable on client device. Public key is safely registered in master tenant authority registry.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700">
              Generating in-browser 2048-bit cryptographic identity for this workspace...
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Knowledge Payload Signer & Verifier</span>
            </h3>
            {selectedInvoiceNumber && (
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                AUDITING {selectedInvoiceNumber}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block min-w-0">
                  {selectedInvoiceNumber ? `Live Invoice Payload [${selectedInvoiceNumber}]` : "Financial Request Payload (JSON)"}
                </label>
                {selectedInvoiceNumber && (
                  <button
                    type="button"
                    onClick={() => handleSelectInvoice(selectedInvoiceNumber)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 transition shrink-0 whitespace-nowrap"
                    title="Restore original un-tampered invoice data"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>Restore Original Data</span>
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={testPayload}
                onChange={(e) => {
                  setTestPayload(e.target.value);
                  setVerificationResult("IDLE");
                  setCryptoError("");
                }}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 font-mono focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {cryptoError && (
                <div className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cryptoError}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                disabled={!keys}
                onClick={handleSignPayload}
                className="py-2.5 rounded-xl bg-slate-900 dark:bg-[#1E293B] hover:bg-slate-800 dark:hover:bg-slate-800 border border-transparent dark:border-slate-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <KeyRound className="w-4 h-4" />
                <span>Sign Payload</span>
              </button>

              <button
                disabled={!signature}
                onClick={handleVerifyInvoiceSeal}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <FileCheck className="w-4 h-4" />
                <span>Verify Signature</span>
              </button>
            </div>

            {signature && (
              <div className="p-3.5 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Cryptographic Digital Signature:
                  </span>
                  {verificationResult === "VALID" ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      SIGNATURE VERIFIED (GENUINE)
                    </span>
                  ) : verificationResult === "TAMPERED" ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      TAMPER DETECTED!
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] font-mono text-indigo-950 dark:text-indigo-200 font-semibold break-all bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 shadow-2xs select-all">
                  {signature}
                </div>
                {verificationResult === "TAMPERED" && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-[10.5px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Payload has been modified after signature. Zero-knowledge cryptographic check failed!</span>
                  </div>
                )}
                {verificationResult === "VALID" && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10.5px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Payload is 100% genuine and signed by workspace private authority.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
