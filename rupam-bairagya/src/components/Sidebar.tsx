import React from "react";
import { LayoutDashboard, ReceiptText, Building, LineChart, KeyRound, Server } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView }) => {
  const navItems = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "ledger", label: "Billing Ledger", icon: ReceiptText },
    { id: "tenants", label: "Tenant Isolation", icon: Building },
    { id: "analytics", label: "Usage & Quotas", icon: LineChart },
    { id: "security", label: "Zero-Knowledge RSA", icon: KeyRound },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Infotact MERN Evaluation</span>
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Project 3: LedgerGuard<br />
            Status: <span className="text-emerald-400 font-medium">Day 5 Production</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        LedgerGuard v1.0.0 Enterprise<br />
        ACID Multi-Tenant Isolated
      </div>
    </aside>
  );
};
