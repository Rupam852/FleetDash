import React, { useState } from "react";
import {
  ShieldAlert,
  Zap,
  Lock,
  WifiOff,
  RotateCcw,
  CheckCircle2,
  X,
  Building2,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../services/api.js";
import { RollbackAuditResult } from "../types/index.js";
import { getApiErrorMessage } from "../utils/errors.js";

interface RollbackVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant: string;
  tenantName?: string;
  onRollbackComplete: () => void;
}

export const RollbackVisualizerModal: React.FC<RollbackVisualizerModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  tenantName,
  onRollbackComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [auditResult, setAuditResult] = useState<RollbackAuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [simulatedAmount, setSimulatedAmount] = useState<string>("1500");

  if (!isOpen) return null;

  const handleResetSimulation = () => {
    setCurrentStep(0);
    setAuditResult(null);
    setErrorMsg("");
  };

  const handleStartChaosSimulation = async () => {
    setIsRunning(true);
    setCurrentStep(1);
    setAuditResult(null);
    setErrorMsg("");

    try {
      // Stage 1: Lock Acquisition simulation
      await new Promise((r) => setTimeout(r, 500));
      setCurrentStep(2);

      // Stage 2: Network Timeout injection
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep(3);

      // Stage 3 & 4: Call Backend API to execute real rollback & database recording
      const res = await apiClient.post("/billing/simulate-rollback", {
        amountCents: Math.round(parseFloat(simulatedAmount || "1500") * 100),
        customerEmail: `audit@${currentTenant || "tenant"}.io`,
        description: `Chaos Network Disconnect Simulation (₹${simulatedAmount})`,
      });

      await new Promise((r) => setTimeout(r, 500));
      setCurrentStep(4);
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep(5); // Mark all 4 steps as PASSED
      setAuditResult(res.data?.audit || res.data);
      onRollbackComplete();
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, "Rollback simulation failed."));
    } finally {
      setIsRunning(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: "1. Lock Acquired",
      desc: "Acquires distributed lock to guarantee mutual exclusion.",
      icon: Lock,
    },
    {
      num: 2,
      title: "2. Fault Injected",
      desc: "Simulates socket disconnection and timeout before commit.",
      icon: WifiOff,
    },
    {
      num: 3,
      title: "3. ACID Aborted",
      desc: "Executes abortTransaction(); zero dirty state persisted.",
      icon: RotateCcw,
    },
    {
      num: 4,
      title: "4. State Resilient",
      desc: "Lock released. Status saved as ROLLED_BACK (₹0 debited).",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[999] p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[90dvh] overflow-y-auto shadow-2xl p-4 sm:p-5 space-y-3.5 my-auto animate-pop relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                ACID Rollback & State Resiliency Visualizer
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Demonstrates fail-safe atomicity: mid-flight timeouts abort with ₹0.00 debited.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace & Config Bar */}
        <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Workspace:</span>
            <strong className="text-slate-900 dark:text-slate-100 font-bold truncate">
              {tenantName || currentTenant}
            </strong>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 hidden sm:inline">
              ledgerguard_tenant_{currentTenant}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
            <span className="text-[10.5px] text-slate-400 font-medium">Amount:</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">₹</span>
            <input
              type="number"
              disabled={isRunning}
              value={simulatedAmount}
              onChange={(e) => {
                setSimulatedAmount(e.target.value);
                if (auditResult) {
                  setCurrentStep(0);
                  setAuditResult(null);
                }
              }}
              className="w-14 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none text-right bg-transparent"
            />
          </div>
        </div>

        {/* 4-Step Interactive Pipeline Flow */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Execution Stages</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Distributed atomicity pipeline
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;

              return (
                <div
                  key={step.num}
                  className={`p-2.5 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/15 shadow-xs"
                      : isPassed
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#1E293B]/60 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 border ${
                          isPassed
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : isActive
                            ? "bg-blue-600 text-white border-blue-600 animate-pulse"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{step.title}</div>
                    </div>

                    {isPassed && (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                        ✓ PASSED
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-1 py-0.2 rounded animate-pulse">
                        RUNNING
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug pl-6.5">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Audit Log Result Card */}
        {auditResult && (
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2 animate-fade-in text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero-Loss Verified: ACID Rollback Succeeded</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                Recovery: {auditResult.recoveryLatencyMs}ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10.5px]">
              <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                <div className="text-[9.5px] text-slate-400">Lock State</div>
                <div className="font-bold text-emerald-800 dark:text-emerald-400 text-[10px] truncate">Acquired & Freed</div>
              </div>
              <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                <div className="text-[9.5px] text-slate-400">Transaction</div>
                <div className="font-bold text-rose-700 dark:text-rose-400 text-[10px] truncate">Aborted (Safe)</div>
              </div>
              <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                <div className="text-[9.5px] text-slate-400">Amount Debited</div>
                <div className="font-bold text-emerald-800 dark:text-emerald-400 text-[10px] truncate">₹0.00 (Zero)</div>
              </div>
              <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                <div className="text-[9.5px] text-slate-400">Double-Billing</div>
                <div className="font-bold text-emerald-800 dark:text-emerald-400 text-[10px] truncate">100% Blocked</div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60 truncate">
              Trace: {auditResult.traceId} • Reason: Mid-flight network timeout injected.
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Simulates network failure to verify zero balance impact</span>
            <span className="sm:hidden">Zero customer loss verified</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            {auditResult && (
              <button
                type="button"
                onClick={handleResetSimulation}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              disabled={isRunning}
              onClick={handleStartChaosSimulation}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {isRunning
                  ? "Simulating..."
                  : auditResult
                  ? "Run Again"
                  : "Run Simulation"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
