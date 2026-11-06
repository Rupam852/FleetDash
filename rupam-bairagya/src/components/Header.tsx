import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  AlertTriangle,
  X,
  Menu,
  Check,
  CheckCircle2,
  FileText,
  Truck,
  ShieldAlert,
  Radio,
  LogOut,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Trash2,
  ArrowRight,
  Clock,
  Phone,
  IdCard,
} from "lucide-react";
import { NavigationTab, LiveAlert, AuthUser, Driver } from "../types.js";

interface HeaderProps {
  activeTab: NavigationTab;
  alerts: LiveAlert[];
  pendingDrivers?: Driver[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onSelectAlert?: (alert: LiveAlert, action?: "lr" | "vehicle" | "geofence" | "driver") => void;
  onDismissAlert?: (alertId: string) => void;
  onApproveDriver?: (driverId: string) => void;
  onRejectDriver?: (driverId: string) => void;
  onDeleteDriver?: (driverId: string) => void;
  onNavigateToDrivers?: () => void;
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  alerts,
  pendingDrivers = [],
  searchQuery,
  setSearchQuery,
  currentUser,
  onLogout,
  onSelectAlert,
  onDismissAlert,
  onApproveDriver,
  onRejectDriver,
  onDeleteDriver,
  onNavigateToDrivers,
  onToggleSidebar,
  onOpenCommandPalette,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"ALL" | "DRIVERS" | "ALERTS">("ALL");

  const pendingDriverCount = pendingDrivers?.length || 0;
  const alertCount = alerts?.length || 0;
  const totalNotifications = pendingDriverCount + alertCount;

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const isMac = typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowUserDropdown(false);
        setShowNotifications(false);
      }
    };

    if (showUserDropdown || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUserDropdown, showNotifications]);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Overview";
      case "lr_management":
        return "LR Consignment Management";
      case "active_shipments":
        return "Active Shipments";
      case "past_shipments":
        return "Past Shipments Archive";
      case "geofencing":
        return "Geofencing Surveillance";
      case "live_tracking":
        return "Live GPS Tracking";
      case "vehicles":
        return "Vehicle Fleet Management";
      case "drivers":
        return "Driver Directory";
      case "suppliers":
        return "Transporter Supplier Network";
      default:
        return "Fleet Management";
    }
  };

  const getAlertBgClass = (severity: LiveAlert["severity"]) => {
    if (severity === "critical") return "bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/70";
    if (severity === "warning") return "bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/70";
    return "bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100/70";
  };

  const getAlertTextClass = (severity: LiveAlert["severity"]) => {
    if (severity === "critical") return "text-rose-800";
    if (severity === "warning") return "text-amber-800";
    return "text-indigo-800";
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-[1100] transition-colors">
      {/* Left: Mobile Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition lg:hidden cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            FleetDash
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
            {getBreadcrumbTitle()}
          </h1>
        </div>
      </div>

      {/* Middle: Universal Search Bar / Command Palette Trigger */}
      <div className="flex-1 max-w-sm lg:max-w-md mx-3 sm:mx-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 50))}
            maxLength={50}
            placeholder="Search shipments, vehicles, drivers..."
            className="w-full bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-20 py-2 text-xs font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400 shadow-xs"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onOpenCommandPalette}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-xs hover:text-slate-900 hover:border-slate-300 transition cursor-pointer select-none"
              title="Open Spotlight Command Palette (Ctrl + K)"
            >
              <span className="font-semibold text-slate-500">{isMac ? "⌘" : "Ctrl"}</span>
              <span className="font-bold text-slate-700">K</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Live Status, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connected chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Connected</span>
        </div>

        {/* Notifications Bell */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition cursor-pointer"
            title="Notifications & Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-xs">
                {totalNotifications > 9 ? "9+" : totalNotifications}
              </span>
            )}
            {pendingDriverCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping pointer-events-none"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-[1200] animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Notifications & Alerts
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {totalNotifications} item{totalNotifications === 1 ? "" : "s"} requiring attention
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {totalNotifications > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      {totalNotifications} New
                    </span>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs (when both driver applications & operational alerts exist) */}
              {pendingDriverCount > 0 && alertCount > 0 && (
                <div className="flex items-center gap-1.5 py-2.5 border-b border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNotificationTab("ALL")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      notificationTab === "ALL"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    All ({totalNotifications})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationTab("DRIVERS")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      notificationTab === "DRIVERS"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-amber-800 bg-amber-50 hover:bg-amber-100/70"
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Drivers</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-200/60 text-amber-900 font-extrabold">
                      {pendingDriverCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationTab("ALERTS")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      notificationTab === "ALERTS"
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "text-rose-800 bg-rose-50 hover:bg-rose-100/70"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Alerts</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-200/60 text-rose-900 font-extrabold">
                      {alertCount}
                    </span>
                  </button>
                </div>
              )}

              {/* Scrollable Notifications Body */}
              <div className="mt-3 space-y-3 max-h-88 overflow-y-auto pr-1">
                {totalNotifications === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">All Operations Clear</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No pending driver registration requests or active operational alerts
                    </p>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: DRIVER REGISTRATION APPROVAL REQUESTS */}
                    {pendingDriverCount > 0 &&
                      (notificationTab === "ALL" || notificationTab === "DRIVERS") && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Driver Approvals ({pendingDriverCount})</span>
                            </span>
                            {onNavigateToDrivers && (
                              <button
                                type="button"
                                onClick={() => {
                                  onNavigateToDrivers();
                                  setShowNotifications(false);
                                }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span>Open Directory</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {pendingDrivers.map((pd) => (
                            <div
                              key={pd.id}
                              onClick={() => {
                                if (onNavigateToDrivers) onNavigateToDrivers();
                                setShowNotifications(false);
                              }}
                              className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/50 hover:bg-amber-50/90 transition cursor-pointer shadow-2xs group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {pd.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs leading-tight group-hover:text-indigo-600 transition">
                                      {pd.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-500" />
                                      <span>Driver Self-Registered</span>
                                    </p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold whitespace-nowrap">
                                  PENDING APPROVAL
                                </span>
                              </div>

                              <div className="mt-2.5 bg-white/90 rounded-lg p-2.5 border border-amber-100 text-[11px] space-y-1 text-slate-700 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>Contact Phone:</span>
                                  </span>
                                  <span className="font-semibold text-slate-800">{pd.phone}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <IdCard className="w-3 h-3 text-slate-400" />
                                    <span>Commercial License #:</span>
                                  </span>
                                  <span className="font-bold text-slate-800">{pd.licenseNumber}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="text-slate-400">Experience / Blood:</span>
                                  <span className="text-slate-700 font-medium">
                                    {pd.experienceYears} Years • {pd.bloodGroup}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Quick Actions */}
                              <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-1.5">
                                {onDeleteDriver && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteDriver(pd.id);
                                    }}
                                    className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                    title="Permanently remove application"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                )}

                                <div className="flex items-center gap-1.5 ml-auto">
                                  {onRejectDriver && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRejectDriver(pd.id);
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                      title="Decline application"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Decline</span>
                                    </button>
                                  )}

                                  {onApproveDriver && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onApproveDriver(pd.id);
                                      }}
                                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                                      title="Approve applicant and activate driver portal login"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve & Grant Login</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* SECTION 2: OPERATIONAL ALERTS & VIOLATIONS */}
                    {alertCount > 0 &&
                      (notificationTab === "ALL" || notificationTab === "ALERTS") && (
                        <div className="space-y-2">
                          {pendingDriverCount > 0 && (
                            <div className="px-1 pt-1">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Operational Alerts ({alertCount})</span>
                              </span>
                            </div>
                          )}

                          {alerts.map((alt) => {
                            const lrMatch = alt.message.match(/LR-\d{4}-\d{4}/);
                            const lrNum = lrMatch ? lrMatch[0] : null;

                            return (
                              <div
                                key={alt.id}
                                onClick={() => {
                                  if (onSelectAlert) onSelectAlert(alt);
                                  setShowNotifications(false);
                                }}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${getAlertBgClass(
                                  alt.severity
                                )}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`font-bold flex items-center gap-1.5 ${getAlertTextClass(
                                      alt.severity
                                    )}`}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {alt.title}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 ">
                                      {alt.timestamp}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDismissAlert) onDismissAlert(alt.id);
                                      }}
                                      className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/70 p-0.5 rounded transition cursor-pointer"
                                      title="Resolve & Dismiss Alert"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="mt-1 text-slate-700 text-[11px] leading-relaxed">
                                  {alt.message}
                                </p>

                                {/* Interactive Direct Action Pills */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-wrap items-center gap-1.5">
                                  {lrNum && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelectAlert) onSelectAlert(alt, "lr");
                                        setShowNotifications(false);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                      title={`Open Consignment ${lrNum}`}
                                    >
                                      <FileText className="w-3 h-3 text-indigo-600" />
                                      <span>View {lrNum}</span>
                                    </button>
                                  )}

                                  {alt.vehicleNumber && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelectAlert) onSelectAlert(alt, "vehicle");
                                        setShowNotifications(false);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                      title={`Track ${alt.vehicleNumber}`}
                                    >
                                      <Truck className="w-3 h-3 text-blue-600" />
                                      <span>Track {alt.vehicleNumber}</span>
                                    </button>
                                  )}

                                  {alt.type === "GEOFENCE_BREACH" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelectAlert) onSelectAlert(alt, "geofence");
                                        setShowNotifications(false);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                      title="Open Geofence Areas"
                                    >
                                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                                      <span>Geofence</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onDismissAlert) onDismissAlert(alt.id);
                                    }}
                                    className="ml-auto px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-[10px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                    title="Mark as Resolved and Remove from Database"
                                  >
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Resolve</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div ref={userDropdownRef} className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              RB
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">Rupam Bairagya</p>
              <p className="text-[10px] text-slate-500 font-medium">Fleet Operations Lead</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-[1200] animate-fadeIn">
              <div className="p-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {currentUser?.name || "Operations Lead"}
                </p>
                <p className="text-[11px] text-slate-500 ">
                  {currentUser?.email || "fleetdash@test.com"}
                </p>
                <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                  Authorized Central Operations
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <div className="px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between">
                  <span>Role</span>
                  <span className="font-semibold text-slate-800">
                    {currentUser?.role === "OFFICE_MANAGER" ? "Fleet Manager" : "Driver"}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between">
                  <span>Shift</span>
                  <span className="font-semibold text-slate-800">Live 24x7 Control</span>
                </div>
              </div>

              {onLogout && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200 hover:border-rose-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
