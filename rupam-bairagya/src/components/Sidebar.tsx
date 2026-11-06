import React from "react";
import {
  LayoutDashboard,
  FileText,
  Truck,
  History,
  ShieldAlert,
  Navigation,
  CarFront,
  Users,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { NavigationTab } from "../types.js";

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeShipmentsCount: number;
  criticalAlertCount: number;
  pendingDriverCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeShipmentsCount,
  criticalAlertCount,
  pendingDriverCount = 0,
  isCollapsed,
  setIsCollapsed,
  onLogout,
}) => {
  const sections = [
    {
      group: "MAIN",
      items: [
        {
          id: "dashboard" as NavigationTab,
          label: "Dashboard",
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: "live_tracking" as NavigationTab,
          label: "Live Tracking Map",
          icon: Navigation,
          badge: "Live",
          badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
        },
      ],
    },
    {
      group: "OPERATIONS",
      items: [
        {
          id: "lr_management" as NavigationTab,
          label: "LR Management",
          icon: FileText,
          badge: null,
        },
        {
          id: "active_shipments" as NavigationTab,
          label: "Active Shipments",
          icon: Truck,
          badge: activeShipmentsCount > 0 ? activeShipmentsCount.toString() : null,
          badgeColor: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
        },
        {
          id: "past_shipments" as NavigationTab,
          label: "Past Shipments",
          icon: History,
          badge: null,
        },
        {
          id: "geofencing" as NavigationTab,
          label: "Geofencing Areas",
          icon: ShieldAlert,
          badge: null,
        },
      ],
    },
    {
      group: "FLEET ASSETS",
      items: [
        {
          id: "vehicles" as NavigationTab,
          label: "Vehicle Management",
          icon: CarFront,
          badge: null,
        },
        {
          id: "drivers" as NavigationTab,
          label: "Driver Management",
          icon: Users,
          badge:
            pendingDriverCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 text-[10px] font-extrabold animate-pulse">
                {pendingDriverCount} New
              </span>
            ) : null,
        },
        {
          id: "suppliers" as NavigationTab,
          label: "Supplier Management",
          icon: Building2,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-72"
      } bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 min-h-screen text-slate-700 select-none transition-all duration-200 z-[1150] shadow-xs`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-indigo-500/25">
            <Truck className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-bold text-slate-900 text-[15px] tracking-tight block leading-tight">
                FleetDash
              </span>
              <span className="text-[11px] text-slate-500 font-medium block leading-none mt-0.5">
                Enterprise Telemetry
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="p-3 flex-1 space-y-4 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.group} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider uppercase text-slate-400">
                {sec.group}
              </p>
            )}
            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5"
                  } rounded-xl text-[13px] font-medium transition cursor-pointer relative ${
                    isActive
                      ? "bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-100 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                        isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer with Direct Logout Icon */}
      <div className={`p-3 border-t border-slate-200/80 bg-slate-50/50 flex ${isCollapsed ? "flex-col items-center gap-2" : "items-center justify-between"}`}>
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
            RB
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <p className="text-[13px] font-semibold text-slate-900 truncate">Rupam Bairagya</p>
              <p className="text-[11px] text-slate-500 truncate">Fleet Operations Lead</p>
            </div>
          )}
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
            title="Sign Out / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
