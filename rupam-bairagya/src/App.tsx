import React, { useState, useEffect } from "react";
import { Header } from "./components/Header.js";
import { Sidebar } from "./components/Sidebar.js";
import { DashboardOverview } from "./views/DashboardOverview.js";
import { BillingLedgerView } from "./views/BillingLedgerView.js";
import { TenantsManagementView } from "./views/TenantsManagementView.js";
import { AnalyticsView } from "./views/AnalyticsView.js";
import { SecurityAuditView } from "./views/SecurityAuditView.js";
import { RollbackVisualizerModal } from "./components/RollbackVisualizerModal.js";
import { Tenant, Invoice, UsageMetrics } from "./types/index.js";
import { apiClient } from "./services/api.js";

export function App() {
  const [currentTenant, setCurrentTenant] = useState<string>("acme_corp");
  const [currentView, setCurrentView] = useState<string>("overview");
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState<boolean>(false);
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      tenantId: "acme_corp",
      name: "Acme Corporation",
      subdomain: "acme.ledgerguard.io",
      databaseName: "ledgerguard_tenant_acme_corp",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      activeInvoicesCount: 142,
      monthlyVolumeCents: 4589000,
    },
    {
      tenantId: "globex_corp",
      name: "Globex Industries",
      subdomain: "globex.ledgerguard.io",
      databaseName: "ledgerguard_tenant_globex_corp",
      tier: "GROWTH",
      status: "ACTIVE",
      activeInvoicesCount: 89,
      monthlyVolumeCents: 2120000,
    },
    {
      tenantId: "soylent_corp",
      name: "Soylent Logistics",
      subdomain: "soylent.ledgerguard.io",
      databaseName: "ledgerguard_tenant_soylent_corp",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      activeInvoicesCount: 310,
      monthlyVolumeCents: 8900000,
    },
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      invoiceNumber: "INV-2026-001",
      idempotencyKey: "idem_acme_987123",
      customerId: "cust_tata_logistics",
      customerEmail: "finance@tata.com",
      amountCents: 450000,
      currency: "INR",
      status: "COMMITTED",
      transactionId: "tx_99182312",
      description: "Q3 High-Throughput Freight Clearing",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      invoiceNumber: "INV-2026-002",
      idempotencyKey: "idem_acme_987124",
      customerId: "cust_reliance_retail",
      customerEmail: "payments@ril.com",
      amountCents: 1250000,
      currency: "INR",
      status: "COMMITTED",
      transactionId: "tx_99182313",
      description: "Dedicated Multi-Tenant Cloud Compute Nodes",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      invoiceNumber: "INV-2026-003",
      idempotencyKey: "idem_acme_crash_test",
      customerId: "cust_simulated_fail",
      customerEmail: "test@fail.com",
      amountCents: 850000,
      currency: "INR",
      status: "ROLLED_BACK",
      transactionId: "tx_aborted_lock_timeout",
      description: "Simulated Mid-Flight Network Failure Test",
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
  ]);

  const [metrics, setMetrics] = useState<UsageMetrics>({
    totalRevenueCents: 2550000,
    committedTransactions: 142,
    rollbacksHandled: 3,
    apiCallCount: 42390,
    storageBytesUsed: 1024 * 1024 * 480,
    quotaLimitPercent: 64.5,
  });

  const handleTenantChange = (tenantId: string) => {
    setCurrentTenant(tenantId);
    localStorage.setItem("ledgerguard_active_tenant", tenantId);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const res = await apiClient.get("/billing/invoices");
      if (res.data?.invoices) {
        setInvoices(res.data.invoices);
      }
    } catch {
      // Fallback to local state if backend offline
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Header
        currentTenant={currentTenant}
        onTenantChange={handleTenantChange}
        onTriggerRollbackDemo={() => setIsRollbackModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onSelectView={setCurrentView} />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-950/50">
          <div className="max-w-6xl mx-auto">
            {currentView === "overview" && (
              <DashboardOverview
                currentTenant={currentTenant}
                metrics={metrics}
                onOpenLedger={() => setCurrentView("ledger")}
                onOpenTenants={() => setCurrentView("tenants")}
              />
            )}
            {currentView === "ledger" && (
              <BillingLedgerView
                invoices={invoices}
                currentTenant={currentTenant}
                onRefresh={fetchData}
              />
            )}
            {currentView === "tenants" && (
              <TenantsManagementView tenants={tenants} onRefresh={fetchData} />
            )}
            {currentView === "analytics" && <AnalyticsView currentTenant={currentTenant} />}
            {currentView === "security" && <SecurityAuditView currentTenant={currentTenant} />}
          </div>
        </main>
      </div>

      <RollbackVisualizerModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        onRollbackComplete={() => {
          setMetrics((prev) => ({ ...prev, rollbacksHandled: prev.rollbacksHandled + 1 }));
          fetchData();
        }}
      />
    </div>
  );
}

export default App;
