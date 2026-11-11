import React, { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  Building,
  LineChart,
  KeyRound,
  ShieldCheck,
  User,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  userEmail?: string;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  userEmail,
  onLogout,
  isMobileOpen = false,
  onMobileOpenChange,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const isOpenRef = useRef<boolean>(false);
  const isOpeningRef = useRef<boolean>(false);

  const navItems = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "ledger", label: "Invoices & Billing", icon: ReceiptText },
    { id: "tenants", label: "Workspaces & Isolation", icon: Building },
    { id: "analytics", label: "Usage & Quotas", icon: LineChart },
    { id: "security", label: "Zero-Knowledge RSA", icon: ShieldCheck },
    { id: "apikeys", label: "API Keys & Webhooks", icon: KeyRound },
  ];

  const setBackgroundInert = (inertValue: boolean) => {
    const mainEl = document.getElementById("main-content") as (HTMLElement & { inert: boolean }) | null;
    const headerEl = document.getElementById("app-header") as (HTMLElement & { inert: boolean }) | null;
    if (mainEl) mainEl.inert = inertValue;
    if (headerEl) headerEl.inert = inertValue;
  };

  const restoreTriggerFocus = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const triggerBtn = document.querySelector<HTMLButtonElement>('[aria-controls="mobile-nav-drawer"]');
    triggerBtn?.focus({ preventScroll: true });
  };

  const closeMobileDrawer = () => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    if (!drawer || !scroller) {
      onMobileOpenChange?.(false);
      return;
    }
    if (typeof drawer.hidePopover === "function" && drawer.matches(":popover-open")) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: "auto" });
    } else {
      onMobileOpenChange?.(false);
    }
  };

  useEffect(() => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!drawer || !scroller || !sheet) return;

    const visibleThreshold = 1 / Math.max(window.innerWidth, 1);
    let hasEntered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        if (entry.intersectionRatio >= visibleThreshold) {
          hasEntered = true;
        }

        if (
          entry.intersectionRatio < visibleThreshold &&
          !isOpeningRef.current &&
          (isOpenRef.current || hasEntered)
        ) {
          isOpenRef.current = false;
          hasEntered = false;
          if (typeof drawer.hidePopover === "function" && drawer.matches(":popover-open")) {
            try {
              drawer.hidePopover();
            } catch {
              // Ignore if already closed
            }
          }
          drawer.removeAttribute("aria-modal");
          setBackgroundInert(false);
          onMobileOpenChange?.(false);
          restoreTriggerFocus();
        }

        if (entry.intersectionRatio >= 0.95 && drawer.matches(":popover-open")) {
          isOpeningRef.current = false;
          isOpenRef.current = true;
          hasEntered = true;
          drawer.setAttribute("aria-modal", "true");
          setBackgroundInert(true);
          closeBtnRef.current?.focus({ preventScroll: true });
          onMobileOpenChange?.(true);
        }
      },
      { root: drawer, threshold: [visibleThreshold, 0.95] }
    );

    observer.observe(sheet);

    // Fallback backdrop fade for browsers without CSS scroll-driven animation-timeline
    let removeScrollFallback: (() => void) | undefined;
    if (typeof CSS !== "undefined" && !CSS.supports("animation-timeline: scroll()")) {
      const handleScroll = () => {
        const width = sheet.offsetWidth || 1;
        const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / width));
        drawer.style.setProperty("--drawer-backdrop", String(ratio));
      };
      scroller.addEventListener("scroll", handleScroll, { passive: true });
      removeScrollFallback = () => scroller.removeEventListener("scroll", handleScroll);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drawer.matches(":popover-open")) {
        event.preventDefault();
        closeMobileDrawer();
      }
    };

    const handleBackdropClick = (event: MouseEvent) => {
      if (!sheet.contains(event.target as Node)) {
        closeMobileDrawer();
      }
    };

    const desktopMql = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (e: MediaQueryListEvent) => {
      if (e.matches && drawer.matches(":popover-open")) {
        isOpeningRef.current = false;
        isOpenRef.current = false;
        try {
          drawer.hidePopover();
        } catch {
          // Ignore
        }
        drawer.removeAttribute("aria-modal");
        setBackgroundInert(false);
        onMobileOpenChange?.(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    drawer.addEventListener("click", handleBackdropClick);
    desktopMql.addEventListener("change", handleViewportChange);

    return () => {
      observer.disconnect();
      removeScrollFallback?.();
      document.removeEventListener("keydown", handleKeyDown);
      drawer.removeEventListener("click", handleBackdropClick);
      desktopMql.removeEventListener("change", handleViewportChange);
      drawer.removeAttribute("aria-modal");
      setBackgroundInert(false);
    };
  }, []);

  useEffect(() => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    if (!drawer || !scroller) return;

    const openDrawer = async () => {
      if (typeof drawer.showPopover !== "function") return;
      isOpeningRef.current = true;
      if (!drawer.matches(":popover-open")) {
        drawer.showPopover();
      }
      drawer.setAttribute("aria-modal", "true");
      setBackgroundInert(true);

      if (typeof CSS === "undefined" || !CSS.supports("scroll-initial-target", "nearest")) {
        scroller.scrollTo({ left: scroller.offsetWidth, behavior: "instant" as ScrollBehavior });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
      }
      scroller.scrollTo({ left: 0, behavior: "auto" });
      isOpeningRef.current = false;
    };

    if (isMobileOpen && !isOpenRef.current) {
      openDrawer();
    } else if (!isMobileOpen && drawer.matches(":popover-open")) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: "auto" });
    }
  }, [isMobileOpen]);

  const renderNavContent = (isDrawer: boolean) => (
    <>
      <div className="p-4 space-y-6">
        {isDrawer && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src="/logos/logo-concept-3-sentinel.svg"
                alt="LedgerGuard"
                className="w-8 h-8 shrink-0"
              />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">LedgerGuard</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">Enterprise Console</div>
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeMobileDrawer}
              aria-label="Close navigation menu"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="px-3.5 pb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  if (isDrawer) {
                    closeMobileDrawer();
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all duration-150 ${isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                  }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                    }`}
                />
                <span className="text-[13.5px] text-left">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Area: User Profile & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
              <User aria-hidden="true" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 text-left">
              <div
                className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate"
                title={userEmail || "admin@acme.com"}
              >
                {userEmail || "admin@acme.com"}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Enterprise Admin</div>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (isDrawer) closeMobileDrawer();
                onLogout();
              }}
              aria-label="Log Out"
              title="Log Out"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0 ml-1 shadow-2xs"
            >
              <LogOut aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (1024px+ unchanged) */}
      <aside className="hidden lg:flex w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex-col justify-between shrink-0 shadow-2xs z-20 transition-colors">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Swipeable Top-Layer Popover Drawer (< 1024px) */}
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-label="Navigation drawer"
        className="MobileDrawer lg:hidden"
        popover="manual"
      >
        <div ref={scrollerRef} className="MobileDrawer-scroller">
          <nav
            ref={sheetRef}
            tabIndex={-1}
            aria-label="Mobile Navigation"
            className="MobileDrawer-sheet bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between"
          >
            {renderNavContent(true)}
          </nav>
        </div>
      </div>
    </>
  );
};
