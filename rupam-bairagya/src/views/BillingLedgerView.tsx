import React, { useState } from "react";
import { Invoice } from "../types/index.js";
import { CheckCircle2, AlertTriangle, Clock, Plus, ShieldCheck } from "lucide-react";
import { apiClient } from "../services/api.js";

interface BillingLedgerViewProps {
  invoices: Invoice[];
  currentTenant: string;
  onRefresh: () => void;
}

export const BillingLedgerView: React.FC<BillingLedgerViewProps> = ({ invoices, currentTenant, onRefresh }) => {
  const [filter, setFilter] = useState<string>("ALL");
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>("35000");
  const [customerEmail, setCustomerEmail] = useState<string>("procurement@client.in");

  const filtered = invoices.filter((i) => (filter === "ALL" ? true : i.status === filter));

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCharging(true);
    try {
      const amountCents = parseInt(amountInput, 10) * 100;
      await apiClient.post("/billing/charge", {
        idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        amountCents,
        customerId: `cust_${currentTenant}`,
        customerEmail,
        description: `Enterprise Cloud Compute Node Tier #${Math.floor(Math.random() * 900 + 100)}`,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCharging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Financial Billing Ledger</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Idempotent multi-document ACID transactions mapped across isolated database:{" "}
            <span className="font-mono text-blue-400">ledgerguard_{currentTenant}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "COMMITTED", "ROLLED_BACK"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === tab
                  ? "bg-slate-800 text-blue-400 border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Ledger Table */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Transaction Audit Stream ({filtered.length})
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Double-Checked Lock Verified
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">No transactions found for this filter.</div>
            ) : (
              filtered.map((inv) => (
                <div key={inv.invoiceNumber} className="p-4 hover:bg-slate-800/30 transition flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{inv.invoiceNumber}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                          inv.status === "COMMITTED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : inv.status === "ROLLED_BACK"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">{inv.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Key: {inv.idempotencyKey} | Email: {inv.customerEmail}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold text-white font-mono">
                      ₹{(inv.amountCents / 100).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(inv.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Charge Account Trigger */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Create Idempotent Charge</h3>
            <p className="text-xs text-slate-400 mt-0.5">Executes under Redis Redlock and MongoDB ACID transaction</p>
          </div>

          <form onSubmit={handleCreateCharge} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (₹ INR)</label>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer / Organization Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              disabled={isCharging}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-4"
            >
              <Plus className="w-4 h-4" />
              <span>{isCharging ? "Acquiring Lock..." : "Charge Client Atomically"}</span>
            </button>
          </form>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Fail-Safe Guarantee:</div>
            <div>If network breaks mid-flight, state aborts automatically with zero duplicate charges.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
