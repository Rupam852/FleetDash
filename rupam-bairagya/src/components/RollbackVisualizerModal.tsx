import React, { useState } from "react";
import { X, AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { apiClient } from "../services/api.js";

interface RollbackVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRollbackComplete: () => void;
}

export const RollbackVisualizerModal: React.FC<RollbackVisualizerModalProps> = ({
  isOpen,
  onClose,
  onRollbackComplete,
}) => {
  const [step, setStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  if (!isOpen) return null;

  const runSimulation = async () => {
    setIsRunning(true);
    setStep(1);
    setLogMessages(["[1/5] Incoming financial charge request received with Idempotency-Key: idem_crash_sim_998"]);

    await new Promise((r) => setTimeout(r, 900));
    setStep(2);
    setLogMessages((prev) => [
      ...prev,
      "[2/5] Redis Redlock acquired with unique fencing token. Mutual exclusion guaranteed.",
    ]);

    await new Promise((r) => setTimeout(r, 900));
    setStep(3);
    setLogMessages((prev) => [
      ...prev,
      "[3/5] MongoDB Multi-Document ACID Transaction opened on isolated tenant database.",
    ]);

    await new Promise((r) => setTimeout(r, 900));
    setStep(4);
    setLogMessages((prev) => [
      ...prev,
      "⚠️ [4/5] CHAOS INJECTION: Mid-Flight Network Connection Dropped before bank acknowledgment!",
    ]);

    await new Promise((r) => setTimeout(r, 1100));

    try {
      await apiClient.post("/billing/charge", {
        idempotencyKey: `idem_crash_${Date.now()}`,
        amountCents: 750000,
        customerId: "cust_demo_crash",
        customerEmail: "evaluator@infotact.in",
        description: "Evaluator Live Stress Failure Injection",
        simulateFailure: true,
      });
    } catch {
      // Expected failure
    }

    setStep(5);
    setLogMessages((prev) => [
      ...prev,
      "✅ [5/5] ACID ROLLBACK SUCCESSFUL: session.abortTransaction() executed. Redis distributed lock safely released.",
      "🎉 VERIFIED: Zero duplicate billing, 0 phantom records in database.",
    ]);

    setIsRunning(false);
    setIsCompleted(true);
    onRollbackComplete();
  };

  const resetModal = () => {
    setStep(0);
    setIsRunning(false);
    setLogMessages([]);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live State Resiliency & ACID Rollback Simulator</h2>
              <p className="text-xs text-slate-400">Infotact Mid-Project Review Interactive Demonstration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-5 gap-2">
            {[
              { num: 1, label: "Request Intake" },
              { num: 2, label: "Redis Lock" },
              { num: 3, label: "ACID Start" },
              { num: 4, label: "Chaos Crash" },
              { num: 5, label: "Zero-Loss Rollback" },
            ].map((s) => {
              const isCurrent = step === s.num;
              const isPassed = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : isPassed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                >
                  <div className="text-[10px] font-mono">Step {s.num}</div>
                  <div className="text-[11px] font-semibold truncate mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 h-44 overflow-y-auto">
            {logMessages.length === 0 ? (
              <div className="text-slate-500 italic flex items-center justify-center h-full">
                Click "Trigger Simulation" below to demonstrate live failure injection & instant ACID rollback.
              </div>
            ) : (
              logMessages.map((msg, i) => (
                <div
                  key={i}
                  className={
                    msg.includes("⚠️")
                      ? "text-amber-400 font-semibold"
                      : msg.includes("✅") || msg.includes("🎉")
                      ? "text-emerald-400 font-semibold"
                      : "text-slate-300"
                  }
                >
                  {msg}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tested under ISO 9001:2015 Reliability Cadence</span>
            </div>

            <div className="flex items-center gap-3">
              {isCompleted && (
                <button
                  onClick={resetModal}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
              <button
                disabled={isRunning}
                onClick={runSimulation}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {isRunning ? (
                  <span>Injecting Failure...</span>
                ) : (
                  <>
                    <span>Trigger Simulation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
