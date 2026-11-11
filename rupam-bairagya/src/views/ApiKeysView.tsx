import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Copy, Check, RefreshCw, Send, CheckCircle2 } from "lucide-react";

interface ApiKeysViewProps {
  currentTenant: string;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({ currentTenant }) => {
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(`https://${currentTenant || "enterprise"}.com/api/v1/ledgerguard-webhook`);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const liveSecretKey = `lg_live_sec_991823_${currentTenant}_448a912d8`;
  const testPubKey = `lg_test_pub_002819_${currentTenant}_771f883c1`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendTestWebhook = () => {
    setIsSendingPing(true);
    setWebhookStatus(null);
    setTimeout(() => {
      setIsSendingPing(false);
      setWebhookStatus("HTTP 200 OK — Delivered event 'invoice.committed'");
    }, 700);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">API Keys & Developer Webhooks</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Programmatic authentication credentials and real-time ledger event streaming for workspace:{" "}
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentTenant}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* API Credentials */}
        <div className="p-4 sm:p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Workspace API Credentials</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium shrink-0">
              ACTIVE
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Live Secret Key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                <span>Production Secret Key:</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-semibold shrink-0">Server-Side Only</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                  {showLiveSecret ? liveSecretKey : "••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => setShowLiveSecret(!showLiveSecret)}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0"
                  title={showLiveSecret ? "Hide Key" : "Reveal Key"}
                >
                  {showLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopy(liveSecretKey, "live")}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0"
                  title="Copy Key"
                >
                  {copiedKey === "live" ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Publishable Key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                <span>Sandbox Publishable Key:</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-sans font-semibold shrink-0">Public Client</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                  {testPubKey}
                </div>
                <button
                  onClick={() => handleCopy(testPubKey, "test")}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0"
                  title="Copy Key"
                >
                  {copiedKey === "test" ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300">Security Best Practice:</div>
            <div>Never share secret keys in client-side code. Requests signed with secret keys bypass rate throttling.</div>
          </div>
        </div>

        {/* Real-time Webhooks Configurator */}
        <div className="p-4 sm:p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Event Stream Webhook</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium">
              DISPATCHER READY
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                Endpoint URL (HTTPS Destination)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Subscribed Events:</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["invoice.committed", "transaction.deduplicated", "tenant.pool_booted"].map((ev) => (
                  <span key={ev} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                    {ev}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSendTestWebhook}
              disabled={isSendingPing}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm mt-3 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSendingPing ? "animate-spin" : ""}`} />
              <span>{isSendingPing ? "Dispatching Webhook..." : "Send Test Ping Event"}</span>
            </button>

            {webhookStatus && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium animate-pop">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{webhookStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

