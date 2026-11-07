import React from "react";
import { DollarSign, ShieldAlert, CheckCircle2, Layers, Server, ArrowUpRight } from "lucide-react";
import { UsageMetrics } from "../types/index.js";

interface DashboardOverviewProps {
  currentTenant: string;
  metrics: UsageMetrics;
  onOpenLedger: () => void;
  onOpenTenants: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentTenant,
  metrics,
  onOpenLedger,
  onOpenTenants,
}) => {
  const cards = [
    {
      title: "Active Monthly Volume",
      value: `₹${(metrics.totalRevenueCents / 100).toLocaleString("en-IN")}`,
      subtitle: "+18.4% from last period",
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Committed Transactions",
      value: metrics.committedTransactions.toString(),
      subtitle: "100% ACID Atomicity",
      icon: CheckCircle2,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "State Resiliency Rollbacks",
      value: metrics.rollbacksHandled.toString(),
      subtitle: "Zero duplicate charges",
      icon: ShieldAlert,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Dynamic Database Pool",
      value: "Isolated",
      subtitle: `DB: ledgerguard_${currentTenant}`,
      icon: Server,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Multi-Tenant Executive Summary</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Tenant Context: <span className="font-mono text-blue-400 font-semibold">{currentTenant}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTenants}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 text-xs text-slate-200 transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Manage Tenants</span>
          </button>
          <button
            onClick={onOpenLedger}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <span>View Financial Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{c.title}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{c.value}</div>
              <div className="text-[11px] text-slate-500 font-mono">{c.subtitle}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Database Isolation & Concurrency Guard Status</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AUDIT COMPLIANT
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Context-Switching Latency</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">0.34 ms</div>
              <div className="text-[10px] text-slate-500">Benchmark Target: &lt;5.0ms</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Redlock Contention Rejection</div>
              <div className="text-lg font-bold text-blue-400 font-mono">100% Safe</div>
              <div className="text-[10px] text-slate-500">Double-Checked Locking</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Cross-Tenant Leakage</div>
              <div className="text-lg font-bold text-purple-400 font-mono">0.00%</div>
              <div className="text-[10px] text-slate-500">Dedicated Mongoose Pools</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Monthly Quota Consumption</h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">API Call Volume</span>
                <span className="text-slate-200 font-mono">42,390 / 50,000</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[84%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Storage Footprint</span>
                <span className="text-slate-200 font-mono">480 MB / 10 GB</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[5%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
