import React from "react";
import { ShieldCheck, Activity, Lock, RefreshCw } from "lucide-react";
import { TenantSwitcher } from "./TenantSwitcher.js";

interface HeaderProps {
  currentTenant: string;
  onTenantChange: (tenantId: string) => void;
  onTriggerRollbackDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTenant, onTenantChange, onTriggerRollbackDemo }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">LedgerGuard</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Zero-Knowledge Engine
            </span>
          </div>
          <div className="text-[11px] text-slate-400">Dynamic Multi-Tenant Enterprise Billing Platform</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Mid-Project Review Demo Button */}
        <button
          onClick={onTriggerRollbackDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Simulate Mid-Flight Rollback</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Redlock: ACTIVE</span>
          <span className="text-slate-600">|</span>
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Isolation: 100%</span>
        </div>

        <TenantSwitcher currentTenant={currentTenant} onTenantChange={onTenantChange} />
      </div>
    </header>
  );
};
