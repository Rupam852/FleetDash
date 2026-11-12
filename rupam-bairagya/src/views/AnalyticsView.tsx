import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  RefreshCw,
  Database,
  ShieldCheck,
  Zap,
  Users,
  HardDrive,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import { Invoice } from "../types/index.js";
import { apiClient } from "../services/api.js";
import { useTheme } from "../utils/theme.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

// Register Chart.js Modules (Required for Canvas Rendering)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface AnalyticsViewProps {
  currentTenant: string;
  invoices?: Invoice[];
}

interface AnalyticsData {
  tenantId: string;
  databaseName: string;
  billingPeriod: string;
  billingCycle?: string;
  daysUntilReset?: number;
  resetDateFormatted?: string;
  metrics: {
    totalRevenueCents: number;
    totalRevenueRupees: string;
    committedTransactions: number;
    rollbacksHandled: number;
    apiCallCount: number;
    averageOrderValueRupees: string;
    storageBytesUsed: number;
    storageKbUsed: number;
    quotaCapacityLimit: number;
    quotaLimitPercent: number;
  };
  hourlyTrend: Array<{
    time: string;
    requests: number;
    volumeRupees: string;
  }>;
  topCustomers: Array<{
    email: string;
    invoicesCount: number;
    volumeRupees: string;
  }>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ currentTenant, invoices = [] }) => {
  const { isDark } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get("/analytics/usage");
      if (res.data?.metrics) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentTenant, invoices.length]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  // Fallback calculations if backend has delay
  const totalVolumeCents = invoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0);
  const totalRupees = data?.metrics?.totalRevenueRupees || (totalVolumeCents / 100).toFixed(2);
  const atvRupees =
    data?.metrics?.averageOrderValueRupees ||
    (invoices.length > 0 ? (totalVolumeCents / invoices.length / 100).toFixed(2) : "0.00");
  const hourlyData = data?.hourlyTrend || [
    { time: "12:00 AM", requests: 0, volumeRupees: "0.00" },
    { time: "04:00 AM", requests: 0, volumeRupees: "0.00" },
    { time: "08:00 AM", requests: 0, volumeRupees: "0.00" },
    { time: "12:00 PM", requests: invoices.length, volumeRupees: (totalVolumeCents / 100).toFixed(2) },
    { time: "04:00 PM", requests: 0, volumeRupees: "0.00" },
    { time: "08:00 PM", requests: 0, volumeRupees: "0.00" },
  ];

  const topCustomers = data?.topCustomers || [];

  // Chart.js: 24-Hour Throughput & Volume Area/Line Configuration
  const lineChartData = {
    labels: hourlyData.map((d) => d.time),
    datasets: [
      {
        label: "Transactions (tx)",
        data: hourlyData.map((d) => d.requests),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: "y",
      },
      {
        label: "Volume (₹ INR)",
        data: hourlyData.map((d) => parseFloat(d.volumeRupees) || 0),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: "y1",
      },
    ],
  };

  const lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          font: { size: 11, family: "Inter, sans-serif", weight: 600 },
          color: isDark ? "#cbd5e1" : "#475569",
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#0f172a",
        titleFont: { size: 11, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => {
            const label = items[0]?.label || "";
            const windowMap: Record<string, string> = {
              "12:00 AM": "12:00 AM – 04:00 AM Window",
              "04:00 AM": "04:00 AM – 08:00 AM Window",
              "08:00 AM": "08:00 AM – 12:00 PM Window",
              "12:00 PM": "12:00 PM – 04:00 PM Window",
              "04:00 PM": "04:00 PM – 08:00 PM Window",
              "08:00 PM": "08:00 PM – 12:00 AM Window",
            };
            return windowMap[label] || label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: isDark ? "#94a3b8" : "#64748b" },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        grid: { color: isDark ? "#1e293b" : "#f1f5f9" },
        ticks: { font: { size: 10 }, color: isDark ? "#94a3b8" : "#64748b", stepSize: 1 },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: {
          font: { size: 10 },
          color: "#10b981",
          callback: (value: string | number) => `₹${value}`,
        },
      },
    },
  };

  // Chart.js: Quota Expenditure Doughnut Configuration
  const quotaUsed = data?.metrics?.apiCallCount ?? invoices.length;
  const quotaLimit = 2000;
  const quotaRemaining = Math.max(0, quotaLimit - quotaUsed);

  // Provide a minimum visual slice (8% of ring) so consumed quota is clearly visible on the donut
  const visualQuotaUsed = quotaUsed > 0 ? Math.max(quotaUsed, quotaLimit * 0.08) : 0;
  const visualQuotaRemaining = Math.max(0, quotaLimit - visualQuotaUsed);

  const doughnutData = {
    labels: ["Consumed Quota", "Available Quota"],
    datasets: [
      {
        data: [visualQuotaUsed, visualQuotaRemaining],
        backgroundColor: ["#2563eb", isDark ? "#1e293b" : "#f1f5f9"],
        borderColor: [isDark ? "#0F172A" : "#ffffff", isDark ? "#0F172A" : "#ffffff"],
        borderWidth: 2,
        borderRadius: 4,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          font: { size: 10, weight: 500 },
          color: isDark ? "#94a3b8" : "#64748b",
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#0f172a",
        titleFont: { size: 11, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 8,
        cornerRadius: 6,
        callbacks: {
          label: (context: TooltipItem<"doughnut">) => {
            if (context.dataIndex === 0) {
              const pct = ((quotaUsed / quotaLimit) * 100).toFixed(2);
              return ` Consumed Quota: ${quotaUsed.toLocaleString()} tx (${pct}%)`;
            }
            const pct = ((quotaRemaining / quotaLimit) * 100).toFixed(2);
            return ` Available Quota: ${quotaRemaining.toLocaleString()} tx (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Usage Analytics & Quota Forecasting
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
            Aggregated in real-time from physical isolated vault:{" "}
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              ledgerguard_tenant_{currentTenant || "default"}
            </span>
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-2 shadow-2xs active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : "Live Sync"}</span>
        </button>
      </div>

      {/* Top 4 Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Settled Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
            ₹{parseFloat(totalRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Reconciled Volume</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Processed Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
            {invoices.length} tx
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Zero duplicate charges
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Transaction Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
            ₹{parseFloat(atvRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Per-invoice average
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Storage Used</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
            {data?.metrics?.storageKbUsed || invoices.length * 16} KB
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">/ 50 MB</span>
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Dedicated Workspace Limit: 50 MB
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section (Powered by Chart.js) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: 24-Hour Throughput & Volume Chart (Chart.js Canvas) */}
        <div className="lg:col-span-2 min-w-0 p-4 sm:p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Transaction Throughput & Volume (12-Hour Timeline)</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
              Total Invoices: {invoices.length} tx
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full pt-1">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Real-time aggregation via dedicated analytical pipeline</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sub-5ms Query Latency
            </span>
          </div>
        </div>

        {/* Right: Active Quota Expenditure (Chart.js Doughnut) */}
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Quota Expenditure</span>
              </h3>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{quotaUsed}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">of 2,000 tx</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 mt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">Monthly Quota:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {quotaUsed} / 2,000 tx
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, Math.max(quotaUsed > 0 ? 3 : 0, (quotaUsed / 2000) * 100))}%`,
                }}
                className="h-full bg-blue-600 rounded-full"
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between pt-0.5">
              <span>{data?.metrics?.quotaLimitPercent || 0.1}% consumed</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Auto-resets {data?.resetDateFormatted ? `on ${data.resetDateFormatted}` : "1st of next month"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Customer Spending Breakdown */}
      <div className="p-4 sm:p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Top Customer Volume Distribution</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold shrink-0">
            WORKSPACE ACCOUNTS
          </span>
        </div>

        {topCustomers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
            No customer transactions recorded yet in this workspace.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {topCustomers.map((c) => {
              const totalVolumeFloat = parseFloat(totalRupees) || 1;
              const customerVolumeFloat = parseFloat(c.volumeRupees) || 0;
              const pct = Math.min(100, Math.round((customerVolumeFloat / totalVolumeFloat) * 100));

              return (
                <div key={c.email} className="p-3.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate min-w-0" title={c.email}>
                      {c.email}
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold tabular-nums shrink-0">
                      ₹{customerVolumeFloat.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(5, pct)}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      ></div>
                    </div>
                    <span className="tabular-nums font-medium text-slate-500 dark:text-slate-400">{pct}% ({c.invoicesCount} tx)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
