import React, { useState } from "react";
import { Building2, Server, CheckCircle2, Shield, Plus } from "lucide-react";
import { Tenant } from "../types/index.js";
import { apiClient } from "../services/api.js";

interface TenantsManagementViewProps {
  tenants: Tenant[];
  onRefresh: () => void;
}

export const TenantsManagementView: React.FC<TenantsManagementViewProps> = ({ tenants, onRefresh }) => {
  const [newTenantId, setNewTenantId] = useState("");
  const [newName, setNewName] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    try {
      await apiClient.post("/tenants/provision", {
        tenantId: newTenantId,
        name: newName,
        tier: "ENTERPRISE",
      });
      setNewTenantId("");
      setNewName("");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Multi-Tenant Isolation Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Each enterprise tenant maps to a completely isolated Mongoose connection pool and dedicated database namespace.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {tenants.map((t) => (
              <div key={t.tenantId} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.subdomain}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    {t.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Database Namespace:</span>
                    <span className="text-blue-400 font-semibold">{t.databaseName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tier:</span>
                    <span className="text-slate-200">{t.tier}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Isolation Model:</span>
                    <span className="text-emerald-400">DEDICATED_DATABASE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provision New Tenant */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 h-fit">
          <div>
            <h3 className="text-sm font-bold text-white">Provision Dedicated Tenant</h3>
            <p className="text-xs text-slate-400 mt-0.5">Automates schema bootstrapping on isolated MongoDB cluster</p>
          </div>

          <form onSubmit={handleProvision} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tenant ID (Identifier)</label>
              <input
                type="text"
                placeholder="e.g. hcl_technologies"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Company / Entity Name</label>
              <input
                type="text"
                placeholder="e.g. HCL Technologies Ltd"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              disabled={isProvisioning}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-4"
            >
              <Plus className="w-4 h-4" />
              <span>{isProvisioning ? "Booting Pool..." : "Provision Isolated Tenant"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
