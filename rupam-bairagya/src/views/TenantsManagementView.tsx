import React, { useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Lock,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import { Tenant } from "../types/index.js";
import { apiClient } from "../services/api.js";
import { PremiumSelect } from "../components/PremiumSelect.js";
import { getApiErrorMessage } from "../utils/errors.js";
import {
  DEFAULT_HOME_STATE,
  WORKSPACE_HOME_STATE_OPTIONS,
  normalizeHomeState,
} from "../utils/gstStates.js";

interface TenantsManagementViewProps {
  tenants: Tenant[];
  onRefresh: () => void;
}

export const TenantsManagementView: React.FC<TenantsManagementViewProps> = ({ tenants, onRefresh }) => {
  // New Provisioning State
  const [newTenantId, setNewTenantId] = useState("");
  const [newName, setNewName] = useState("");
  const [newHomeState, setNewHomeState] = useState("");
  const [provisionStateError, setProvisionStateError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Edit State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editHomeState, setEditHomeState] = useState(DEFAULT_HOME_STATE);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [editAdminPin, setEditAdminPin] = useState("");
  const [showEditAdminPin, setShowEditAdminPin] = useState(false);
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [showEditCurrentPassword, setShowEditCurrentPassword] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [showEditNewPassword, setShowEditNewPassword] = useState(false);
  const [editRemovePassword, setEditRemovePassword] = useState(false);
  const [editError, setEditError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantId || !newName) return;
    if (!newHomeState) {
      setProvisionStateError("Please select your Registered State.");
      showNotification("error", "Please select a Registered State (GST Home State) for this workspace.");
      document.getElementById("provision-home-state")?.focus();
      return;
    }

    setProvisionStateError("");
    setIsProvisioning(true);
    try {
      await apiClient.post("/tenants/provision", {
        tenantId: newTenantId.trim().toLowerCase(),
        name: newName.trim(),
        tier: "ENTERPRISE",
        homeState: newHomeState,
        workspacePassword: newPassword.trim() || undefined,
      });
      setNewTenantId("");
      setNewName("");
      setNewHomeState("");
      setNewPassword("");
      showNotification("success", `Tenant workspace '${newName}' provisioned with dedicated isolated database.`);
      onRefresh();
    } catch (err: unknown) {
      showNotification("error", getApiErrorMessage(err, "Failed to provision tenant."));
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleStartEdit = (t: Tenant) => {
    setEditingTenant(t);
    setEditName(t.name);
    setEditHomeState(normalizeHomeState(t.homeState));
    setEditStatus(t.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE");
    setEditAdminPin("");
    setShowEditAdminPin(false);
    setEditCurrentPassword("");
    setEditNewPassword("");
    setEditRemovePassword(false);
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editName.trim()) return;

    // Check if status is changing (ACTIVE <-> SUSPENDED)
    if (editStatus !== editingTenant.status) {
      if (!editAdminPin.trim()) {
        setEditError(
          `Master Admin PIN is required to ${editStatus === "SUSPENDED" ? "suspend" : "reactivate"
          } this workspace.`
        );
        return;
      }
    }

    if (editingTenant.isPasswordProtected && !editRemovePassword && editNewPassword && !editCurrentPassword) {
      setEditError("Current password is required to change workspace security password.");
      return;
    }
    if (editingTenant.isPasswordProtected && editRemovePassword && !editCurrentPassword) {
      setEditError("Current password is required to remove password protection.");
      return;
    }

    setIsUpdating(true);
    setEditError("");
    try {
      await apiClient.put(`/tenants/${editingTenant.tenantId}`, {
        name: editName.trim(),
        tier: editingTenant.tier || "ENTERPRISE",
        status: editStatus,
        homeState: editHomeState,
        adminPin: editAdminPin.trim() || undefined,
        currentPassword: editCurrentPassword.trim() || undefined,
        newPassword: editRemovePassword ? "NONE" : (editNewPassword.trim() || undefined),
        removePassword: editRemovePassword,
      });

      showNotification("success", `Workspace '${editName}' updated successfully (${editStatus}).`);
      setEditingTenant(null);
      onRefresh();
    } catch (err: unknown) {
      setEditError(getApiErrorMessage(err, "Failed to update workspace."));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTenant) return;
    if (deletingTenant.isPasswordProtected && !deletePassword) {
      setDeleteError("Password is required to delete this protected workspace.");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete(`/tenants/${deletingTenant.tenantId}`, {
        data: { workspacePassword: deletePassword },
      });
      showNotification("success", `Workspace '${deletingTenant.name}' and its isolated database were removed.`);
      setDeletingTenant(null);
      setDeletePassword("");
      onRefresh();
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete workspace."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Enterprise Multi-Workspace Isolation Directory</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Each client workspace maps to a completely isolated Mongoose connection pool and dedicated database namespace.
        </p>
      </div>

      {/* Action Feedback Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${notification.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Provisioned Tenants List with Edit & Remove Actions */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {tenants.length === 0 ? (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-10 sm:p-12 text-center shadow-sm space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Client Workspaces Provisioned</div>
              <div className="text-xs text-slate-400 max-w-sm mx-auto">
                Provision your first client workspace using the form to create an isolated database pool.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tenants.map((t) => {
                const isRoot = t.tenantId === "acme_corp";

                return (
                  <div
                    key={t.tenantId}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition min-w-0"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={t.name}>
                              {t.name}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono">
                              {t.subdomain}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${t.status === "ACTIVE"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs mt-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-slate-500 dark:text-slate-400">
                          <span className="shrink-0">Database Namespace:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold font-mono text-[11px] break-all min-w-0" title={t.databaseName}>
                            {t.databaseName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5 text-slate-500 dark:text-slate-400">
                          <span className="shrink-0">Isolation Model:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] sm:text-xs whitespace-nowrap">DEDICATED_DATABASE</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                          <span className="shrink-0">Origin State (GST):</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] truncate text-right" title={normalizeHomeState(t.homeState)}>
                            {normalizeHomeState(t.homeState)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 text-slate-500 dark:text-slate-400 items-center pt-0.5">
                          <span className="shrink-0">Security Gate:</span>
                          {t.isPasswordProtected ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[11px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>Passcode Locked</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[11px]">Open Access</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row: Edit & Delete Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(t)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Edit Details</span>
                      </button>

                      {isRoot ? (
                        <div
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-slate-700 text-slate-400 text-xs flex items-center gap-1 select-none cursor-not-allowed"
                          title="Root lead tenant 'acme_corp' is protected from deletion"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Protected</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingTenant(t);
                            setDeletePassword("");
                            setDeleteError("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Provision New Tenant Form */}
        <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4 h-fit">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Provision Dedicated Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automates schema bootstrapping on isolated tenant vault cluster</p>
          </div>

          <form onSubmit={handleProvision} className="space-y-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Workspace ID (Slug)</label>
              <input
                type="text"
                placeholder="techcorp or stripe_workspace"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Company / Entity Name</label>
              <input
                type="text"
                placeholder="TechCorp Solutions"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>

            <div>
              <label htmlFor="provision-home-state" className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
                Registered State (GST Home State)
              </label>
              <PremiumSelect
                id="provision-home-state"
                value={newHomeState}
                onChange={(val) => {
                  setNewHomeState(val);
                  if (val) setProvisionStateError("");
                }}
                options={WORKSPACE_HOME_STATE_OPTIONS}
                placeholder="Please select state"
                searchPlaceholder="Search state or GST code..."
                searchable
                clearable
                clearAriaLabel="Clear selected state"
                size="sm"
                menuClassName="left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[295px]"
                icon={<MapPin className="w-3.5 h-3.5" />}
                emptyMessage="No matching state found"
              />
              {provisionStateError ? (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 block">
                  {provisionStateError}
                </span>
              ) : (
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  Determines Intra-State (CGST+SGST) vs IGST on customer invoices.
                </span>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">Security Password / PIN (Optional)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Leave blank for open access"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  tabIndex={-1}
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Protects this workspace with a passcode requirement.
              </span>
            </div>

            <button
              disabled={isProvisioning}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm mt-4 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isProvisioning ? "Booting Pool..." : "Provision Isolated Workspace"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-5 animate-pop">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Workspace Details</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {editingTenant.tenantId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mb-1">Company / Entity Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-home-state" className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  Registered State (GST Home State)
                </label>
                <PremiumSelect
                  id="edit-home-state"
                  value={editHomeState}
                  onChange={setEditHomeState}
                  options={WORKSPACE_HOME_STATE_OPTIONS}
                  placeholder="Select workspace state..."
                  searchPlaceholder="Search state or GST code..."
                  searchable
                  size="sm"
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  emptyMessage="No matching state found"
                />
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Updates Intra-State (CGST+SGST) vs IGST for future invoices; past invoices remain unchanged.
                </span>
              </div>

              {/* Workspace Password Management Section */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Workspace Security Passcode</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${editingTenant.isPasswordProtected
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    {editingTenant.isPasswordProtected ? "Locked" : "Open Access"}
                  </span>
                </div>

                {editingTenant.isPasswordProtected ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showEditCurrentPassword ? "text" : "password"}
                          value={editCurrentPassword}
                          onChange={(e) => {
                            setEditCurrentPassword(e.target.value);
                            setEditError("");
                          }}
                          placeholder="Enter current password to authorize changes"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditCurrentPassword(!showEditCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                          tabIndex={-1}
                          title={showEditCurrentPassword ? "Hide password" : "Show password"}
                        >
                          {showEditCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {!editRemovePassword ? (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          New Password (optional)
                        </label>
                        <div className="relative">
                          <input
                            type={showEditNewPassword ? "text" : "password"}
                            value={editNewPassword}
                            onChange={(e) => setEditNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                            tabIndex={-1}
                            title={showEditNewPassword ? "Hide password" : "Show password"}
                          >
                            {showEditNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditRemovePassword(true)}
                          className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold block"
                        >
                          Remove Password (Set to Open Access)
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
                        <span>Passcode will be removed upon saving.</span>
                        <button
                          type="button"
                          onClick={() => setEditRemovePassword(false)}
                          className="text-[11px] font-semibold underline text-slate-600 dark:text-slate-400"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Set Security Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditNewPassword ? "text" : "password"}
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        placeholder="Enter new password to lock this workspace"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                        tabIndex={-1}
                        title={showEditNewPassword ? "Hide password" : "Show password"}
                      >
                        {showEditNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mb-1.5">Workspace Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("ACTIVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${editStatus === "ACTIVE"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/15"
                      : "bg-slate-50 dark:bg-[#1E293B]/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1E293B]"
                      }`}
                  >
                    ● ACTIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("SUSPENDED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${editStatus === "SUSPENDED"
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/15"
                      : "bg-slate-50 dark:bg-[#1E293B]/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1E293B]"
                      }`}
                  >
                    ● SUSPENDED
                  </button>
                </div>
              </div>

              {/* Master Admin PIN prompt when changing status (ACTIVE <-> SUSPENDED) */}
              {editingTenant && editStatus !== editingTenant.status && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      {editStatus === "SUSPENDED"
                        ? "Master Security PIN Required to Suspend"
                        : "Master Security PIN Required to Reactivate"}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                    Changing workspace status to <strong>{editStatus}</strong> requires Master Authorization. Enter the Master Security PIN to confirm:
                  </p>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showEditAdminPin ? "text" : "password"}
                      maxLength={6}
                      placeholder="Enter Master Security PIN"
                      value={editAdminPin}
                      onChange={(e) => setEditAdminPin(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg pl-8 pr-9 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditAdminPin(!showEditAdminPin)}
                      aria-label={showEditAdminPin ? "Hide PIN" : "Show PIN"}
                      title={showEditAdminPin ? "Hide PIN" : "Show PIN"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                    >
                      {showEditAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isUpdating ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTenant && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-red-200 dark:border-red-900/60 shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 animate-pop">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Permanently Remove Workspace?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{deletingTenant.name}</strong> (
                  <span className="font-mono text-slate-700 dark:text-slate-300">{deletingTenant.tenantId}</span>)?
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200/80 dark:border-red-900/60 text-[11px] text-red-800 dark:text-red-300 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                <span>Irreversible Data Deletion Warning</span>
              </div>
              <p className="text-[10.5px] text-red-700 dark:text-red-300/80 leading-normal">
                This will drop the dedicated physical vault{" "}
                <span className="font-mono font-semibold">ledgerguard_tenant_{deletingTenant.tenantId}</span> and permanently delete all its invoices and keys.
              </p>
            </div>

            {/* If password protected, require password */}
            {deletingTenant.isPasswordProtected && (
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Passcode Required to Authorize Deletion</span>
                </div>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    autoFocus
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError("");
                    }}
                    placeholder="Enter workspace security password"
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-2xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-amber-700/70 dark:text-amber-400 hover:text-amber-900 transition"
                    tabIndex={-1}
                    title={showDeletePassword ? "Hide password" : "Show password"}
                  >
                    {showDeletePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTenant(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm shadow-red-500/20 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Purging DB..." : "Yes, Delete Workspace"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
