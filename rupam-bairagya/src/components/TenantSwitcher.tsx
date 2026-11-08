import React from "react";
import { Building2, ChevronDown } from "lucide-react";

interface TenantSwitcherProps {
  currentTenant: string;
  onTenantChange: (tenantId: string) => void;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ currentTenant, onTenantChange }) => {
  const tenants = [
    { id: "acme_corp", name: "Acme Corporation", tier: "ENTERPRISE", badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { id: "globex_corp", name: "Globex Industries", tier: "GROWTH", badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { id: "soylent_corp", name: "Soylent Logistics", tier: "ENTERPRISE", badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ];

  const active = tenants.find((t) => t.id === currentTenant) || tenants[0];

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 hover:border-slate-700 transition cursor-pointer">
        <Building2 className="w-4 h-4 text-blue-400" />
        <div className="text-left">
          <div className="text-xs font-semibold text-slate-200">{active.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">Isolated DB: ledgerguard_{active.id}</div>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ml-1 ${active.badgeColor}`}>
          {active.tier}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </div>

      <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1.5 hidden group-hover:block z-50">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Switch Tenant Context
        </div>
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => onTenantChange(t.id)}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
              t.id === currentTenant ? "bg-slate-800/80 text-blue-400 font-medium" : "text-slate-300"
            }`}
          >
            <div>
              <div>{t.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">id: {t.id}</div>
            </div>
            <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${t.badgeColor}`}>
              {t.tier}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
