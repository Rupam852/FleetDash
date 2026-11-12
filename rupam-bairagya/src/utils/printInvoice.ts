import { Invoice, Tenant } from "../types/index.js";
import QRCode from "qrcode";
import { apiClient } from "../services/api.js";
import { computeGstSplit } from "./gstStates.js";

/**
 * Converts a number to Indian Rupee Words
 */
function numberToWordsINR(amount: number): string {
  const rounded = Math.floor(amount);
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
  }

  function convertThreeDigits(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (Math.floor(n / 100) > 0) {
      str += units[Math.floor(n / 100)] + " Hundred ";
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  if (rounded === 0) return "Zero Rupees Only";

  let result = "";
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  if (crore > 0) result += convertTwoDigits(crore) + " Crore ";
  if (lakh > 0) result += convertTwoDigits(lakh) + " Lakh ";
  if (thousand > 0) result += convertTwoDigits(thousand) + " Thousand ";
  if (remainder > 0) result += convertThreeDigits(remainder) + " ";

  return (result.trim() + " Rupees Only").toUpperCase();
}

/**
 * Prints or saves an elite, modern Fintech A4 PDF Statement for an invoice.
 */
export async function printInvoiceStatement(
  invoice: Invoice,
  currentTenant: string,
  tenantName?: string,
  tenantHomeState?: string
): Promise<void> {
  const isGst = invoice.isGstApplicable !== false;
  const qty = invoice.quantity || 1;
  const basePriceRupees = invoice.amountCents / 100;
  const gstSplit = computeGstSplit(
    basePriceRupees,
    isGst,
    invoice.supplyType,
    invoice.sellerState,
    invoice.placeOfSupply
  );
  const unitPriceRupees = invoice.unitPriceCents
    ? (invoice.unitPriceCents / 100).toFixed(2)
    : (basePriceRupees / qty).toFixed(2);
  const subtotalRupees = basePriceRupees.toFixed(2);
  const gstRupees = gstSplit.totalGstRupees.toFixed(2);
  const grandTotalRupees = (basePriceRupees + gstSplit.totalGstRupees).toFixed(2);
  const isRolledBack = invoice.status === "ROLLED_BACK";
  const formattedDate = new Date(invoice.timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = new Date(invoice.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Resolve true edited workspace / organization name and state
  let resolvedTenantName = tenantName;
  let resolvedTenantState = tenantHomeState;
  if (!resolvedTenantName || !resolvedTenantState) {
    try {
      const tRes = await apiClient.get<{ tenants?: Tenant[] }>("/tenants").catch(() => null);
      if (tRes?.data?.tenants) {
        const matched = tRes.data.tenants.find(
          (t) => t.tenantId.toLowerCase() === currentTenant.toLowerCase()
        );
        if (!resolvedTenantName && matched?.name) {
          resolvedTenantName = matched.name;
        }
        if (!resolvedTenantState && matched?.homeState) {
          resolvedTenantState = matched.homeState;
        }
      }
    } catch {
      // ignore
    }
  }
  const sellerOriginState = invoice.sellerState || resolvedTenantState;

  const tenantDisplayName =
    resolvedTenantName ||
    currentTenant.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Enterprise Organization";
  const amountWords = numberToWordsINR(parseFloat(grandTotalRupees));

  // Dynamically resolve active Wi-Fi / Hotspot LAN IP from backend so mobile scanning works on any network
  let resolvedHost = window.location.hostname;
  if (resolvedHost === "localhost" || resolvedHost === "127.0.0.1") {
    try {
      const ipRes = await apiClient.get("/billing/server-ip");
      if (ipRes.data?.ip && ipRes.data.ip !== "localhost") {
        resolvedHost = ipRes.data.ip;
      }
    } catch {
      resolvedHost = "10.105.171.164";
    }
  }
  const port = window.location.port ? `:${window.location.port}` : "";
  const verifyUrl = `${window.location.protocol}//${resolvedHost}${port}/?verify=${invoice.invoiceNumber}`;

  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(verifyUrl, {
      type: "svg",
      width: 76,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice_${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
      }
      .invoice-sheet {
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        padding: 24px 28px !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.4;
      font-size: 11.5px;
      padding: 12px;
    }
    .invoice-sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 28px 32px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    }

    /* Top Accent Line */
    .brand-accent-bar {
      height: 4px;
      background: ${isRolledBack ? "linear-gradient(90deg, #ef4444, #f97316)" : "linear-gradient(90deg, #2563eb, #38bdf8, #6366f1)"};
      border-radius: 4px;
      margin-bottom: 20px;
    }

    /* Header Grid */
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-svg {
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      flex-shrink: 0;
      display: block;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }
    .brand-subtitle {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 500;
    }
    .brand-workspace-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f1f5f9;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 9.5px;
      color: #334155;
      font-weight: 600;
      margin-top: 5px;
      border: 1px solid #e2e8f0;
    }

    .header-meta {
      text-align: right;
    }
    .doc-type-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: ${isRolledBack ? "#b91c1c" : "#1e40af"};
      text-transform: uppercase;
    }
    .doc-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      margin-top: 4px;
      background: ${isRolledBack ? "#fef2f2" : "#f0fdf4"};
      color: ${isRolledBack ? "#dc2626" : "#166534"};
      border: 1px solid ${isRolledBack ? "#fecaca" : "#bbf7d0"};
    }
    .invoice-id-display {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
    }
    .invoice-date-display {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Parties / Entity Grid */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 18px 0;
    }
    .party-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .party-card-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .party-line {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2.5px;
      display: flex;
      gap: 6px;
    }
    .party-label {
      color: #64748b;
      min-width: 80px;
      font-weight: 500;
    }
    .party-value {
      color: #0f172a;
      font-weight: 600;
    }
    .party-value-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e40af;
      font-weight: 600;
    }

    /* Items Table */
    .table-container {
      margin-top: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead th {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 12px;
      border-bottom: 1px solid #cbd5e1;
    }
    tbody td {
      padding: 11px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
      color: #1e293b;
      vertical-align: middle;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .item-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 11.5px;
    }
    .item-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .sac-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .col-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
    }

    /* Financial Summary Section */
    .financials-section {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 16px;
      margin-top: 14px;
      align-items: start;
    }
    .words-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .words-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .words-text {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .compliance-pill-box {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.4;
    }

    .calculation-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3.5px 0;
      font-size: 11px;
      color: #475569;
    }
    .calc-row-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #0f172a;
    }
    .calc-tax-divider {
      border-top: 1px dashed #cbd5e1;
      margin: 4px 0;
      padding-top: 4px;
    }
    .calc-total-banner {
      background: ${isRolledBack ? "#fef2f2" : "#eff6ff"};
      border: 1px solid ${isRolledBack ? "#fecaca" : "#bfdbfe"};
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .calc-total-label {
      font-size: 11.5px;
      font-weight: 800;
      color: ${isRolledBack ? "#991b1b" : "#1e40af"};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .calc-total-amount {
      font-size: 16px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: ${isRolledBack ? "#dc2626" : "#1d4ed8"};
    }

    /* Cryptographic & Audit Proof Banner */
    .audit-container {
      margin-top: 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .audit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      flex: 1;
    }
    .audit-item {
      font-size: 9.5px;
      display: flex;
      flex-direction: column;
    }
    .audit-item-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-size: 8.5px;
    }
    .audit-item-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e293b;
      font-weight: 600;
      font-size: 9.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .qr-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
      flex-shrink: 0;
    }
    .qr-svg-wrapper {
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-caption {
      font-size: 7.5px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-top: 2px;
    }
    .qr-sub {
      font-size: 6.5px;
      color: #64748b;
      font-family: ui-monospace, monospace;
    }

    /* Footer / Authorized Signatory */
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      gap: 16px;
    }
    .legal-notice {
      font-size: 9px;
      color: #64748b;
      line-height: 1.4;
      max-width: 440px;
    }
    .signatory-box {
      text-align: right;
      flex-shrink: 0;
    }
    .rsa-seal {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.3px;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      white-space: nowrap;
    }
    .signatory-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .signatory-time {
      font-size: 8px;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="invoice-sheet">
    <!-- Top Accent Bar -->
    <div class="brand-accent-bar"></div>

    <!-- Header Section -->
    <div class="header-grid">
      <div class="brand-left">
        <!-- Sentinel Vector Emblem -->
        <svg class="brand-logo-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="inv_lg3_shield" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#1E293B"/>
              <stop offset="60%" stop-color="#0F172A"/>
              <stop offset="100%" stop-color="#020617"/>
            </linearGradient>
            <linearGradient id="inv_lg3_stroke" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#38BDF8"/>
              <stop offset="50%" stop-color="#2563EB"/>
              <stop offset="100%" stop-color="#1D4ED8"/>
            </linearGradient>
            <linearGradient id="inv_lg3_bar" x1="60" y1="36" x2="60" y2="84" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#60A5FA"/>
              <stop offset="100%" stop-color="#2563EB"/>
            </linearGradient>
          </defs>
          <path d="M60 14 L98 28 L98 62 C98 84, 80 101, 60 108 C40 101, 22 84, 22 62 L22 28 Z" fill="url(#inv_lg3_shield)" stroke="url(#inv_lg3_stroke)" stroke-width="3" stroke-linejoin="round"/>
          <path d="M60 22 L90 33 L90 60 C90 77, 76 92, 60 98 C44 92, 30 77, 30 60 L30 33 Z" stroke="#38BDF8" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>
          <rect x="39" y="50" width="8" height="24" rx="4" fill="#38BDF8"/>
          <rect x="56" y="38" width="8" height="46" rx="4" fill="url(#inv_lg3_bar)"/>
          <circle cx="60" cy="44" r="2.2" fill="#FFFFFF"/>
          <rect x="73" y="50" width="8" height="24" rx="4" fill="#818CF8"/>
        </svg>

        <div>
          <div class="brand-title">LedgerGuard</div>
          <div class="brand-subtitle">Enterprise Zero-Knowledge Multi-Tenant Billing Gateway</div>
          <div class="brand-workspace-tag">
            <span>Isolated Vault:</span>
            <strong style="color: #2563eb;">ledgerguard_tenant_${currentTenant}</strong>
          </div>
        </div>
      </div>

      <div class="header-meta">
        <div class="doc-type-title">
          ${isRolledBack ? "VOID / ABORTED STATEMENT" : isGst ? "TAX INVOICE & RECEIPT" : "COMMERCIAL INVOICE"}
        </div>
        <div>
          ${isRolledBack
            ? `<span class="doc-status-badge">● ROLLED BACK (₹0.00 DEBITED)</span>`
            : `<span class="doc-status-badge">● PAID & CRYPTOGRAPHICALLY SEALED</span>`
          }
        </div>
        <div class="invoice-id-display">${invoice.invoiceNumber}</div>
        <div class="invoice-date-display">Date: ${formattedDate} ${formattedTime}</div>
      </div>
    </div>

    <!-- Parties Grid (Issued By vs Billed To) -->
    <div class="parties-grid">
      <!-- Issuer Card -->
      <div class="party-card">
        <div class="party-card-title">
          <span>Issued By (Enterprise Tenant)</span>
          <span style="color: #059669; font-size: 8.5px;">✓ VERIFIED SELLER</span>
        </div>
        <div class="party-name">${tenantDisplayName}</div>
        <div class="party-line">
          <span class="party-label">Workspace ID:</span>
          <span class="party-value-mono">${currentTenant}</span>
        </div>
        <div class="party-line">
          <span class="party-label">Storage Vault:</span>
          <span class="party-value">Dedicated Physical Isolation</span>
        </div>
        <div class="party-line">
          <span class="party-label">GST Compliance:</span>
          <span class="party-value">${isGst ? "Registered (GSTIN Verified)" : "Non-GST / Exempt Commercial"}</span>
        </div>
        ${sellerOriginState ? `
        <div class="party-line">
          <span class="party-label">Origin State:</span>
          <span class="party-value">${sellerOriginState}</span>
        </div>
        ` : ""}
        <div class="party-line">
          <span class="party-label">ACID Guarantee:</span>
          <span class="party-value">Strict Atomicity (Zero Leakage)</span>
        </div>
      </div>

      <!-- Billed To Card -->
      <div class="party-card">
        <div class="party-card-title">
          <span>Billed To (Customer Details)</span>
          <span style="font-size: 8.5px; color: #64748b;">RECIPIENT INFO</span>
        </div>
        <div class="party-name">${invoice.customerName || "Enterprise Client"}</div>
        <div class="party-line">
          <span class="party-label">Client Email:</span>
          <span class="party-value">${invoice.customerEmail}</span>
        </div>
        <div class="party-line">
          <span class="party-label">Client GSTIN:</span>
          <span class="party-value-mono">${invoice.customerGstin ? invoice.customerGstin : "N/A (B2C / Consumer)"}</span>
        </div>
        ${invoice.placeOfSupply ? `
        <div class="party-line">
          <span class="party-label">Place of Supply:</span>
          <span class="party-value">${invoice.placeOfSupply}</span>
        </div>
        ` : ""}
        ${invoice.billingAddress ? `
        <div class="party-line">
          <span class="party-label">Billing Address:</span>
          <span class="party-value">${invoice.billingAddress}</span>
        </div>
        ` : `
        <div class="party-line">
          <span class="party-label">Payment Mode:</span>
          <span class="party-value">Online Electronic Settlement</span>
        </div>
        <div class="party-line">
          <span class="party-label">Currency:</span>
          <span class="party-value">INR (₹ Indian Rupee)</span>
        </div>
        `}
      </div>
    </div>

    <!-- Line Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="col-center">#</th>
            <th>Item & Service Description</th>
            <th style="width: 75px;" class="col-center">SAC Code</th>
            <th style="width: 55px;" class="col-center">Qty</th>
            <th style="width: 105px;" class="col-right">Unit Rate (₹)</th>
            <th style="width: 110px;" class="col-right">Taxable Amt (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-center" style="font-weight: 600; color: #64748b;">1</td>
            <td>
              <div class="item-title">${invoice.description && invoice.description.trim() ? invoice.description : "Enterprise Infrastructure & Billing Services"}</div>
              <div class="item-sub">Managed via Distributed ACID Redlock Gateway & Dynamic Multi-Tenant Registry</div>
            </td>
            <td class="col-center"><span class="sac-pill">${invoice.sacCode || "998313"}</span></td>
            <td class="col-center col-mono" style="font-weight: 700;">${qty}</td>
            <td class="col-right col-mono">₹${unitPriceRupees}</td>
            <td class="col-right col-mono" style="font-weight: 700; color: #0f172a;">₹${subtotalRupees}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Financial Breakdown Section -->
    <div class="financials-section">
      <!-- Words & Notes Card -->
      <div class="words-card">
        <div>
          <div class="words-label">Invoice Amount in Words</div>
          <div class="words-text">${amountWords}</div>
        </div>

        <div class="compliance-pill-box">
          ${isRolledBack
            ? `<strong style="color: #dc2626;">Fail-Safe Zero-Loss Guarantee:</strong> Transaction aborted mid-flight. Financial lock cleanly released with ₹0.00 debited.`
            : isGst
            ? `Taxable Base: <strong>₹${basePriceRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong> | GST Rate: <strong>18.00%</strong> (₹${gstRupees}) | Payment: <strong>Settled via Gateway</strong>`
            : `Invoice Value: <strong>₹${basePriceRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong> (Exempt / Commercial B2B Settlement)`
          }
        </div>
      </div>

      <!-- Calculation Card -->
      <div class="calculation-card">
        <div class="calc-row">
          <span>${isGst ? "Taxable Subtotal (Base):" : "Subtotal Amount:"}</span>
          <span class="calc-row-val">₹${basePriceRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        ${!isGst ? `
        <div class="calc-row">
          <span>GST (0.0% Exempt):</span>
          <span class="calc-row-val" style="color: #64748b;">₹0.00</span>
        </div>
        ` : gstSplit.mode === "INTRA_STATE" ? `
        <div class="calc-row">
          <span>CGST (9.0% Central):</span>
          <span class="calc-row-val" style="color: #2563eb;">₹${gstSplit.cgstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="calc-row">
          <span>SGST (9.0% State):</span>
          <span class="calc-row-val" style="color: #2563eb;">₹${gstSplit.sgstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        ` : gstSplit.mode === "INTER_STATE" ? `
        <div class="calc-row">
          <span>IGST (18.0% Inter-State):</span>
          <span class="calc-row-val" style="color: #2563eb;">₹${gstSplit.igstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        ` : `
        <div class="calc-row">
          <span>GST (18.0%):</span>
          <span class="calc-row-val" style="color: #2563eb;">₹${gstRupees}</span>
        </div>
        `}

        <div class="calc-total-banner">
          <span class="calc-total-label">Grand Total (INR):</span>
          <span class="calc-total-amount">₹${Number(grandTotalRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <!-- Cryptographic Audit & Live Verification Strip -->
    <div class="audit-container">
      <div class="audit-grid">
        <div class="audit-item">
          <span class="audit-item-label">Idempotency Key</span>
          <span class="audit-item-value" title="${invoice.idempotencyKey}">${invoice.idempotencyKey || "idemp_live_verified"}</span>
        </div>
        <div class="audit-item">
          <span class="audit-item-label">Distributed Concurrency</span>
          <span class="audit-item-value" style="color: #059669;">Redis Redlock (SET NX EX) ✓</span>
        </div>
        <div class="audit-item">
          <span class="audit-item-label">Transaction Reference</span>
          <span class="audit-item-value">${invoice.transactionId || "tx_settled_atomic"}</span>
        </div>
        <div class="audit-item">
          <span class="audit-item-label">Physical Vault Storage</span>
          <span class="audit-item-value">tenant_${currentTenant} [Isolated Shard]</span>
        </div>
      </div>

      <!-- Verification QR Badge -->
      <div class="qr-badge">
        <div class="qr-svg-wrapper">
          ${qrSvg}
        </div>
        <span class="qr-caption">Scan to Verify</span>
        <span class="qr-sub">Public Portal Proof</span>
      </div>
    </div>

    <!-- Legal & Signature Footer -->
    <div class="footer-section">
      <div class="legal-notice">
        <p><strong>Authenticity Guarantee:</strong> This is a computer-generated tax invoice issued through the LedgerGuard Multi-Tenant Gateway. It is immutable, cryptographically sealed with asymmetric RSA-256 keys, and protected by distributed ACID Redlock concurrency.</p>
      </div>

      <div class="signatory-box">
        <div class="rsa-seal">✓ RSA-256 DIGITALLY SEALED</div>
        <div class="signatory-title">${(tenantDisplayName || currentTenant || "ORGANIZATION").toUpperCase()}</div>
        <div style="font-size: 8px; color: #64748b;">Authorized Cryptographic Signatory</div>
        <div class="signatory-time">${new Date(invoice.timestamp || Date.now()).toISOString()}</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  // Hidden iframe printing ensures popup blocker never blocks the print dialog
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback to window.open if iframe fails
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      win.print();
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Trigger print after styles render
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up DOM after user prints or closes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 300);
}
