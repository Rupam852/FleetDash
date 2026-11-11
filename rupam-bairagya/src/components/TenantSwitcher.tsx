import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { Building2, ChevronDown, Check, Database, ShieldCheck, Lock, KeyRound, X, AlertCircle, Eye, EyeOff, Search } from "lucide-react";
import { Tenant } from "../types/index.js";
import { apiClient } from "../services/api.js";
import { getApiErrorMessage } from "../utils/errors.js";

interface TenantSwitcherProps {
  currentTenant: string;
  tenants: Tenant[];
  onTenantChange: (tenantId: string, tokenAlreadyRefreshed?: boolean) => void;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  currentTenant,
  tenants,
  onTenantChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const listboxId = `tenant-switcher-listbox-${useId()}`;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Security Gate Password Modal State
  const [targetTenant, setTargetTenant] = useState<Tenant | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const active = tenants.find((t) => t.tenantId === currentTenant) || {
    tenantId: currentTenant || (tenants.length > 0 ? tenants[0].tenantId : "acme_corp"),
    name:
      tenants.find((t) => t.tenantId === currentTenant)?.name ||
      (currentTenant === "acme_corp"
        ? "Acme Corporation"
        : currentTenant || "Workspace"),
    tier: "ENTERPRISE" as const,
    isPasswordProtected: false,
  };

  const showSearch = tenants.length > 3;

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!showSearch || !q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tenantId.toLowerCase().includes(q)
    );
  }, [tenants, showSearch, searchQuery]);

  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false);
    setSearchQuery("");
    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus({ preventScroll: true });
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const currentIdx = tenants.findIndex((t) => t.tenantId === currentTenant);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : tenants.length > 0 ? 0 : -1);

    const frame = requestAnimationFrame(() => {
      if (showSearch && searchInputRef.current) {
        searchInputRef.current.focus({ preventScroll: true });
      } else if (listboxRef.current) {
        listboxRef.current.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, showSearch]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(filteredTenants.length > 0 ? 0 : -1);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen]);

  const handleSelectTenant = (t: Tenant) => {
    if (t.tenantId === currentTenant) {
      closeMenu(true);
      return;
    }

    if (t.isPasswordProtected) {
      setTargetTenant(t);
      setPasswordInput("");
      setPasswordError("");
      setIsOpen(false);
      setSearchQuery("");
    } else {
      onTenantChange(t.tenantId);
      closeMenu(true);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu(false);
    } else if (event.key === "ArrowDown" && filteredTenants.length > 0) {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredTenants.length);
    } else if (event.key === "ArrowUp" && filteredTenants.length > 0) {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredTenants.length) % filteredTenants.length);
    } else if (event.key === "Home" && filteredTenants.length > 0) {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === "End" && filteredTenants.length > 0) {
      event.preventDefault();
      setHighlightedIndex(filteredTenants.length - 1);
    } else if (event.key === "Enter" && highlightedIndex >= 0 && filteredTenants[highlightedIndex]) {
      event.preventDefault();
      handleSelectTenant(filteredTenants[highlightedIndex]);
    }
  };

  const handleVerifyAndSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTenant || !passwordInput) return;

    setIsVerifying(true);
    setPasswordError("");

    try {
      const res = await apiClient.post("/auth/switch-workspace", {
        tenantId: targetTenant.tenantId,
        workspacePassword: passwordInput,
      });

      if (res.data?.token) {
        localStorage.setItem("ledgerguard_auth_token", res.data.token);
        onTenantChange(targetTenant.tenantId, true);
        setTargetTenant(null);
        setPasswordInput("");
      }
    } catch (err: unknown) {
      setPasswordError(getApiErrorMessage(err, "Incorrect workspace password. Access denied."));
    } finally {
      setIsVerifying(false);
    }
  };

  const activeDescendantId =
    isOpen && highlightedIndex >= 0 && filteredTenants[highlightedIndex]
      ? `${listboxId}-opt-${highlightedIndex}`
      : undefined;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (isOpen ? closeMenu(false) : setIsOpen(true))}
          onKeyDown={(e) => {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isOpen) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={`Switch client workspace, active workspace ${active.name}`}
          className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-xl border transition-all duration-150 select-none focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 focus-visible:outline-offset-2 ${
            isOpen
              ? "bg-white dark:bg-[#1E293B] border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/15 dark:ring-blue-400/20 shadow-sm"
              : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800 shadow-2xs"
          }`}
        >
          <div
            aria-hidden="true"
            className="hidden sm:flex w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"
          >
            <Building2 className="w-4 h-4" />
          </div>

          <div className="text-left min-w-0">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-1.5">
              <span className="max-w-[92px] sm:max-w-none truncate">{active.name}</span>
              {active.isPasswordProtected && (
                <span title="Password-Protected Workspace" className="shrink-0">
                  <Lock aria-hidden="true" className="w-3 h-3 text-amber-500 shrink-0" />
                </span>
              )}
            </div>
            <div className="hidden sm:block text-[10.5px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
              {active.tenantId ? `workspace: ${active.tenantId}` : "workspace"}
            </div>
          </div>

          <ChevronDown
            aria-hidden="true"
            className={`w-3.5 h-3.5 text-slate-400 sm:ml-1 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
            }`}
          />
        </button>

        {/* Floating Menu Popover */}
        {isOpen && (
          <div
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 mt-2 w-[min(20rem,calc(100dvw-1.5rem))] sm:w-80 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 ring-1 ring-slate-900/5 dark:ring-white/10 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/70 p-2 z-[110] origin-top-right animate-pop focus:outline-none"
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/90 mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Client Workspaces ({tenants.length})
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck aria-hidden="true" className="w-3 h-3" />
                <span>Isolated DBs</span>
              </span>
            </div>

            {showSearch && (
              <div className="px-1 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/80">
                <div className="relative flex items-center">
                  <Search
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search workspaces..."
                    aria-label="Search workspaces"
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendantId}
                    className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/40 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus({ preventScroll: true });
                      }}
                      aria-label="Clear workspace search"
                      className="absolute right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition"
                    >
                      <X aria-hidden="true" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              tabIndex={showSearch ? undefined : -1}
              aria-label="Client Workspaces"
              aria-activedescendant={!showSearch ? activeDescendantId : undefined}
              className="space-y-1 max-h-[min(17rem,calc(100dvh-13rem))] overflow-y-auto overscroll-contain dropdown-scrollbar focus:outline-none"
            >
              {filteredTenants.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400 italic text-center">
                  {tenants.length === 0 ? "No provisioned workspaces found" : "No matching workspaces"}
                </div>
              ) : (
                filteredTenants.map((t, idx) => {
                  const isSelected = t.tenantId === currentTenant;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={t.tenantId}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      id={`${listboxId}-opt-${idx}`}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectTenant(t)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors duration-100 border ${
                        isSelected
                          ? "bg-blue-50/90 dark:bg-blue-950/55 text-blue-900 dark:text-blue-200 font-semibold border-blue-200/80 dark:border-blue-800/70"
                          : isHighlighted
                          ? "bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-700/80"
                          : "text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          aria-hidden="true"
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">{t.name}</span>
                            {t.isPasswordProtected && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 shrink-0">
                                <Lock aria-hidden="true" className="w-2.5 h-2.5" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-normal truncate">
                            <Database aria-hidden="true" className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">ledgerguard_tenant_{t.tenantId}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          aria-hidden="true"
                          className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-2.5 py-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Runtime Partition: Dedicated Vault</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Active & Clean</span>
            </div>
          </div>
        )}
      </div>

      {/* Security Gate: Workspace Password Verification Modal */}
      {targetTenant && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-pop text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setTargetTenant(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Security Gate</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter security password to access <strong className="text-slate-800 dark:text-slate-200">{targetTenant.name}</strong>
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndSwitch} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Workspace Passcode / Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Enter workspace password"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTargetTenant(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !passwordInput}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm"
                >
                  {isVerifying ? "Verifying..." : "Unlock & Enter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
