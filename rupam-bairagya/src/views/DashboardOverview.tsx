import React, { useState } from "react";
import {
  Truck,
  TrendingUp,
  AlertTriangle,
  Users,
  ArrowRight,
  Download,
  Plus,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { Vehicle, Shipment, NavigationTab, Driver } from "../types.js";

interface DashboardOverviewProps {
  vehicles: Vehicle[];
  shipments: Shipment[];
  drivers: Driver[];
  setActiveTab: (tab: NavigationTab) => void;
  onSelectShipment: (shipment: Shipment) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  vehicles,
  shipments,
  drivers,
  setActiveTab,
  onSelectShipment,
}) => {
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month">("today");

  // Operational metrics
  const activeShipments = shipments.filter(
    (s) => s.status === "IN_TRANSIT" || s.status === "LOADING"
  );
  const inTransitCount = shipments.filter((s) => s.status === "IN_TRANSIT").length;
  const loadingCount = shipments.filter((s) => s.status === "LOADING").length;
  const pendingCount = shipments.filter((s) => s.status === "PENDING").length;
  const assignedCount = shipments.filter((s) => s.status === "ASSIGNED").length;
  const deliveredCount = shipments.filter((s) => s.status === "DELIVERED").length;
  const totalShipments = shipments.length || 1;

  const ownTrips = activeShipments.filter((s) => {
    const v = vehicles.find((veh) => veh.vehicleNumber === s.vehicleNumber);
    return v?.ownership === "OWN";
  }).length;
  const hiredTrips = activeShipments.length - ownTrips;

  const eWayExpiringCount = shipments.filter(
    (s) =>
      s.eWayBillExpiryHours !== undefined &&
      s.eWayBillExpiryHours > 0 &&
      s.eWayBillExpiryHours <= 12
  ).length;

  const approvedDriversList = drivers.filter((d) => d.approvalStatus === "APPROVED");
  const totalDrivers = approvedDriversList.length;
  const activeDrivers = approvedDriversList.filter((d) => d.status === "ON_DUTY").length;
  const driverDutyRate = Math.round((activeDrivers / (totalDrivers || 1)) * 100);

  const tentativeVehicles = vehicles.filter((v) => v.status === "TENTATIVE").length;
  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const readyForDispatch = vehicles.filter(
    (v) => v.status === "AVAILABLE" && v.ownership === "OWN"
  ).length;
  const inUseCount = vehicles.filter((v) => v.status === "IN_TRANSIT").length;
  const maintCount = vehicles.filter((v) => v.status === "MAINTENANCE").length;

  // Breakdown by truck size
  const size20ft = vehicles.filter((v) => v.size === "20 ft");
  const size32ft = vehicles.filter((v) => v.size === "32 ft");
  const size40ft = vehicles.filter((v) => v.size === "40 ft");
  const sizeTrailer = vehicles.filter((v) => v.size === "Trailer");

  const utilizationRate = Math.round((inUseCount / (vehicles.length || 1)) * 100);

  // Export CSV Handler
  const handleExportSummary = () => {
    const rows = [
      ["Metric", "Value"],
      ["Active Shipments", activeShipments.length],
      ["Own Vehicle Trips", ownTrips],
      ["Hired Vehicle Trips", hiredTrips],
      ["E-Way Bill Expiry Alerts", eWayExpiringCount],
      ["Total Drivers", totalDrivers],
      ["Active Drivers", activeDrivers],
      ["Available Vehicles", availableVehicles],
      ["Vehicles in Transit", inUseCount],
      ["Vehicles in Maintenance", maintCount],
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_summary_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Time Selector and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Fleet Operations Overview
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time GPS telemetry, active consignment dispatches, and compliance status
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time range selector */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs text-xs">
            {(["today", "week", "month"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                  timeFilter === filter
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter === "today" ? "Today" : filter === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Create LR Button */}
          <button
            onClick={() => setActiveTab("lr_management")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm hover:shadow transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New LR</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Featured Hero KPI Cards with Soft Squircle Enclosures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Active Shipments */}
        <div
          onClick={() => setActiveTab("active_shipments")}
          className="clean-card p-6 cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Shipments
            </span>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {activeShipments.length}
            </div>
            {/* Dynamic Data-Driven Sparkline */}
            <div className="w-20 h-8 flex-shrink-0">
              {activeShipments.length === 0 ? (
                <svg viewBox="0 0 80 30" className="w-full h-full text-slate-300 overflow-visible">
                  <line
                    x1="2"
                    y1="24"
                    x2="76"
                    y2="24"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <circle cx="76" cy="24" r="3" fill="#94a3b8" />
                </svg>
              ) : (
                (() => {
                  const activePeak = Math.max(6, 24 - Math.min(18, activeShipments.length * 3));
                  return (
                    <svg viewBox="0 0 80 30" className="w-full h-full text-indigo-600 overflow-visible">
                      <defs>
                        <linearGradient id="indigoSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 2 24 C 24 24, 48 ${Math.round((24 + activePeak) / 2)}, 76 ${activePeak} L 76 28 L 2 28 Z`}
                        fill="url(#indigoSparkGrad)"
                      />
                      <path
                        d={`M 2 24 C 24 24, 48 ${Math.round((24 + activePeak) / 2)}, 76 ${activePeak}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="76" cy={activePeak} r="4.5" fill="currentColor" opacity="0.2" />
                      <circle cx="76" cy={activePeak} r="2.2" fill="#ffffff" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  );
                })()
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium truncate">
              {inTransitCount} in-transit • {loadingCount} loading
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 whitespace-nowrap shrink-0">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Fleet Utilization */}
        <div
          onClick={() => setActiveTab("vehicles")}
          className="clean-card p-6 cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fleet Utilization
            </span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {utilizationRate}%
            </div>
            {/* Dynamic Fleet Utilization Sparkline */}
            <div className="w-20 h-8 flex-shrink-0">
              {vehicles.length === 0 || utilizationRate === 0 ? (
                <svg viewBox="0 0 80 30" className="w-full h-full text-slate-300 overflow-visible">
                  <line
                    x1="2"
                    y1="24"
                    x2="76"
                    y2="24"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <circle cx="76" cy="24" r="3" fill="#94a3b8" />
                </svg>
              ) : (
                (() => {
                  const utilPeak = Math.max(6, Math.round(24 - (utilizationRate / 100) * 18));
                  return (
                    <svg viewBox="0 0 80 30" className="w-full h-full text-emerald-600 overflow-visible">
                      <defs>
                        <linearGradient id="emeraldSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 2 24 C 24 24, 48 ${Math.round((24 + utilPeak) / 2)}, 76 ${utilPeak} L 76 28 L 2 28 Z`}
                        fill="url(#emeraldSparkGrad)"
                      />
                      <path
                        d={`M 2 24 C 24 24, 48 ${Math.round((24 + utilPeak) / 2)}, 76 ${utilPeak}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="76" cy={utilPeak} r="4.5" fill="currentColor" opacity="0.2" />
                      <circle cx="76" cy={utilPeak} r="2.2" fill="#ffffff" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  );
                })()
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium truncate">
              {inUseCount} of {vehicles.length} trucks active
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${
                vehicles.length === 0
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : utilizationRate === 0
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : utilizationRate < 40
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : utilizationRate <= 80
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
              }`}
            >
              {vehicles.length === 0
                ? "No Fleet"
                : utilizationRate === 0
                ? "Idle"
                : utilizationRate < 40
                ? "Low"
                : utilizationRate <= 80
                ? "Optimal"
                : "High Demand"}
            </span>
          </div>
        </div>

        {/* KPI 3: E-Way Bills Expiry Notice */}
        <div
          onClick={() => setActiveTab("active_shipments")}
          className="clean-card p-6 cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              E-Way Bill Alerts
            </span>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {eWayExpiringCount}
            </div>
            {eWayExpiringCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-xs font-semibold">
                &lt; 12 hrs left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
                ✓ All Clear
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium truncate">
              {eWayExpiringCount > 0 ? "Action required on E-Way portal" : "All consignment e-way bills valid"}
            </span>
            {eWayExpiringCount > 0 ? (
              <span className="font-semibold text-amber-700 underline text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                <span>Renew</span>
                <span>→</span>
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 text-[11px] whitespace-nowrap shrink-0">
                Compliant
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Driver Directory */}
        <div
          onClick={() => setActiveTab("drivers")}
          className="clean-card p-6 cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Drivers
            </span>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {activeDrivers}
              <span className="text-base text-slate-400 font-normal ml-1">/ {totalDrivers}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                totalDrivers === 0
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              }`}
            >
              {totalDrivers === 0 ? "0 Drivers" : `${driverDutyRate}% Duty`}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium truncate">
              {totalDrivers === 0 ? "No drivers registered" : `${totalDrivers - activeDrivers} drivers on standby`}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap shrink-0">
              Drivers <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Secondary Operational Stats Strip (5 Key Numbers) */}
      <div className="clean-card-static p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
          <div className="px-3 py-1 flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500 font-medium">Own Vehicle Trips:</span>
            <span className="font-bold text-slate-900 tabular-nums">{ownTrips} Active</span>
          </div>

          <div className="px-3 py-1 flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500 font-medium">Hired Vehicle Trips:</span>
            <span className="font-bold text-slate-900 tabular-nums">{hiredTrips} Active</span>
          </div>

          <div className="px-3 py-1 flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500 font-medium">Available in Yard:</span>
            <span className="font-bold text-emerald-700 tabular-nums">{availableVehicles} Ready</span>
          </div>

          <div className="px-3 py-1 flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500 font-medium">Ready for Dispatch:</span>
            <span className="font-bold text-indigo-700 tabular-nums">{readyForDispatch} Cleared</span>
          </div>

          <div className="px-3 py-1 flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-500 font-medium">Total Registered Fleet:</span>
            <span className="font-bold text-slate-900 tabular-nums">{vehicles.length} Units</span>
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Fleet Status Summary & Live Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Fleet Status Summary by Truck Size (2 Cols) */}
        <div className="lg:col-span-2 clean-card-static p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Fleet Status Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vehicle availability and active transit categorized by container specification
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {vehicles.length} Total Units
              </span>
            </div>

            {/* Container Category Cards with Progress Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-5">
              {/* 20 ft Standard */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">20 ft Standard</span>
                    <span className="text-[11px] text-slate-500 font-semibold">14T</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {size20ft.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {size20ft.filter((v) => v.status === "AVAILABLE").length} Avail
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${(size20ft.filter((v) => v.status === "IN_TRANSIT").length / (size20ft.length || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                    {size20ft.filter((v) => v.status === "IN_TRANSIT").length} in-transit
                  </span>
                </div>
              </div>

              {/* 32 ft Multi-Axle */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">32 ft Multi-Axle</span>
                    <span className="text-[11px] text-slate-500 font-semibold">18T</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {size32ft.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {size32ft.filter((v) => v.status === "AVAILABLE").length} Avail
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${(size32ft.filter((v) => v.status === "IN_TRANSIT").length / (size32ft.length || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                    {size32ft.filter((v) => v.status === "IN_TRANSIT").length} in-transit
                  </span>
                </div>
              </div>

              {/* 40 ft High Cube */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">40 ft High Cube</span>
                    <span className="text-[11px] text-slate-500 font-semibold">28T</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {size40ft.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {size40ft.filter((v) => v.status === "AVAILABLE").length} Avail
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${(size40ft.filter((v) => v.status === "IN_TRANSIT").length / (size40ft.length || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                    {size40ft.filter((v) => v.status === "IN_TRANSIT").length} in-transit
                  </span>
                </div>
              </div>

              {/* Heavy Trailers */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Trailers / Heavy</span>
                    <span className="text-[11px] text-slate-500 font-semibold">38T</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {sizeTrailer.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {sizeTrailer.filter((v) => v.status === "AVAILABLE").length} Avail
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${(sizeTrailer.filter((v) => v.status === "IN_TRANSIT").length / (sizeTrailer.length || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                    {sizeTrailer.filter((v) => v.status === "IN_TRANSIT").length} in-transit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* E-Way Bill Compliance Notice */}
          {eWayExpiringCount > 0 && (
            <div className="mt-2 p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    E-Way Bill Renewal Required ({eWayExpiringCount} Shipments)
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Shipments {shipments.filter(s => s.eWayBillExpiryHours && s.eWayBillExpiryHours <= 12).map(s => s.lrNumber).join(", ")} have validity expiring in less than 12 hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("active_shipments")}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 underline whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                Extend on Portal →
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Fleet Quick-View with Circular Donut Gauge (1 Col) */}
        <div className="clean-card-static p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Live Fleet Status
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Real-Time
              </span>
            </div>

            {/* Circular Donut Ring Representation */}
            <div className="my-5 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* In Transit Arc (50%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#4f46e5"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - inUseCount / (vehicles.length || 1))}
                    fill="transparent"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-nums leading-none">
                    {inUseCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1">On Road</span>
                </div>
              </div>
            </div>

            {/* Fleet Status Breakdown List */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  In-Transit on Road
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {inUseCount} Trucks ({Math.round((inUseCount / (vehicles.length || 1)) * 100)}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Available in Yards
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {availableVehicles} Trucks ({Math.round((availableVehicles / (vehicles.length || 1)) * 100)}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  In Maintenance
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {maintCount} Truck ({Math.round((maintCount / (vehicles.length || 1)) * 100)}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  Standby / Tentative
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {tentativeVehicles} Truck ({Math.round((tentativeVehicles / (vehicles.length || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("live_tracking")}
            className="w-full mt-4 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm hover:shadow cursor-pointer active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Full-Screen Live Tracking</span>
          </button>
        </div>
      </div>

      {/* 5. Shipment Status Distribution Pipeline */}
      <div className="clean-card-static p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Shipment Status Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live lifecycle progression across all active booking manifests
            </p>
          </div>
          <button
            onClick={() => setActiveTab("lr_management")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New LR</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden gap-1 p-0.5 border border-slate-200/60">
          <div
            style={{ width: `${(pendingCount / totalShipments) * 100}%` }}
            className="bg-slate-400 rounded-full"
            title={`Pending: ${pendingCount}`}
          ></div>
          <div
            style={{ width: `${(assignedCount / totalShipments) * 100}%` }}
            className="bg-amber-400 rounded-full"
            title={`Assigned: ${assignedCount}`}
          ></div>
          <div
            style={{ width: `${(loadingCount / totalShipments) * 100}%` }}
            className="bg-amber-500 rounded-full"
            title={`Loading: ${loadingCount}`}
          ></div>
          <div
            style={{ width: `${(inTransitCount / totalShipments) * 100}%` }}
            className="bg-indigo-600 rounded-full"
            title={`In-Transit: ${inTransitCount}`}
          ></div>
          <div
            style={{ width: `${(deliveredCount / totalShipments) * 100}%` }}
            className="bg-emerald-500 rounded-full"
            title={`Delivered: ${deliveredCount}`}
          ></div>
        </div>

        {/* Status Milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-5 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span className="text-slate-600 font-semibold">Pending</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{pendingCount}</span>
              <span className="text-slate-500 text-[11px] tabular-nums font-semibold">
                {Math.round((pendingCount / totalShipments) * 100)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-slate-600 font-semibold">Assigned</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{assignedCount}</span>
              <span className="text-slate-500 text-[11px] tabular-nums font-semibold">
                {Math.round((assignedCount / totalShipments) * 100)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-slate-600 font-semibold">Loading</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{loadingCount}</span>
              <span className="text-slate-500 text-[11px] tabular-nums font-semibold">
                {Math.round((loadingCount / totalShipments) * 100)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span className="text-slate-600 font-semibold">In-Transit</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{inTransitCount}</span>
              <span className="text-slate-500 text-[11px] tabular-nums font-semibold">
                {Math.round((inTransitCount / totalShipments) * 100)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-semibold">Delivered</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{deliveredCount}</span>
              <span className="text-slate-500 text-[11px] tabular-nums font-semibold">
                {Math.round((deliveredCount / totalShipments) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Active Consignments Table */}
      <div className="clean-card-static overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Dispatched Shipments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest consignments in transit and delivered along the freight corridor
            </p>
          </div>
          <button
            onClick={() => setActiveTab("active_shipments")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Shipments Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-5 whitespace-nowrap">LR Number</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-5">Client</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Vehicle & Driver</th>
                <th className="py-3.5 px-5">Route</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-5 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No consignments dispatched yet. Generate your first Lorry Receipt (LR) from the LR Management tab.
                  </td>
                </tr>
              ) : (
                shipments.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="inline-block whitespace-nowrap font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200/80 px-2.5 py-1 rounded-md text-[11px]">
                        {s.lrNumber}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 tabular-nums whitespace-nowrap">{s.lrDate}</td>
                    <td className="py-4 px-5 font-semibold text-slate-900">{s.clientName}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 whitespace-nowrap">{s.vehicleNumber}</div>
                      <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{s.driverName}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <span>{s.pickupLocation}</span>
                        <span className="text-slate-400">→</span>
                        <span>{s.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {s.containerType} • <span className="tabular-nums">{s.weightTonnes}T</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                          s.status === "IN_TRANSIT"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                            : s.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : s.status === "LOADING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            s.status === "IN_TRANSIT"
                              ? "bg-indigo-600"
                              : s.status === "DELIVERED"
                              ? "bg-emerald-600"
                              : s.status === "LOADING"
                              ? "bg-amber-600"
                              : "bg-slate-400"
                          }`}
                        ></span>
                        <span className="whitespace-nowrap">{s.status.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectShipment(s)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
