import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  Building2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Plus,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  Zap,
  Database,
  MapPin,
} from "lucide-react";
import { apiClient } from "../services/api.js";
import { ThemeToggle } from "../components/ThemeToggle.js";
import { PremiumSelect } from "../components/PremiumSelect.js";
import { WORKSPACE_HOME_STATE_OPTIONS } from "../utils/gstStates.js";
import { AuthUser, Tenant } from "../types/index.js";
import { getApiErrorMessage } from "../utils/errors.js";

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, tenantId: string) => void;
  onOpenPublicVerification?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenPublicVerification }) => {
  // Navigation Flow: "LOGIN" | "RESET_PASSWORD" | "SELECT_WORKSPACE" | "CREATE_WORKSPACE"
  const [authStep, setAuthStep] = useState<"LOGIN" | "RESET_PASSWORD" | "SELECT_WORKSPACE" | "CREATE_WORKSPACE">("LOGIN");

  // Credentials (EMPTY by default; populated when clicking 'Quick Fill')
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Toggle Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showWorkspacePassword, setShowWorkspacePassword] = useState<boolean>(false);
  const [showNewWorkspacePassword, setShowNewWorkspacePassword] = useState<boolean>(false);

  // Reset Password Fields (EMPTY by default)
  const [resetEmail, setResetEmail] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Post-Login Workspaces State
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Tenant[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workspacePassword, setWorkspacePassword] = useState<string>("");
  const [pendingSessionToken, setPendingSessionToken] = useState<string>("");

  // New Workspace Creation State
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>("");
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState<string>("");
  const [newWorkspaceHomeState, setNewWorkspaceHomeState] = useState<string>("");
  const [newWorkspacePassword, setNewWorkspacePassword] = useState<string>("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState<boolean>(false);

  // Quick 1-Click Demo Fill for Admin
  const handleQuickFillAdmin = () => {
    setEmail("admin@acme.com");
    setPassword("admin123");
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Step 1: Handle Initial Email & Password Sign In
  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your work email address.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      // Exactly 1 workspace found -> Directly log in
      if (res.data?.token && res.data?.activeWorkspace) {
        localStorage.setItem("ledgerguard_auth_token", res.data.token);
        localStorage.setItem("ledgerguard_active_tenant", res.data.activeWorkspace.tenantId);
        localStorage.setItem("ledgerguard_user", JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user, res.data.activeWorkspace.tenantId);
        return;
      }

      // Multiple workspaces found -> Show "Choose Workspace" screen
      if (res.data?.requiresSelection && res.data?.availableWorkspaces?.length > 0) {
        setPendingSessionToken(res.data.sessionToken || "");
        setAvailableWorkspaces(res.data.availableWorkspaces);
        setSelectedWorkspaceId(res.data.availableWorkspaces[0].tenantId);
        setAuthStep("SELECT_WORKSPACE");
        return;
      }

      // 0 workspaces found -> Show "Create Workspace" screen
      if (res.data?.requiresCreation) {
        setPendingSessionToken(res.data.sessionToken || "");
        setAuthStep("CREATE_WORKSPACE");
        return;
      }
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, "Authentication failed. Please check credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Submit Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!resetEmail.trim()) {
      setErrorMsg("Please enter your account email address.");
      return;
    }
    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and Confirm password do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password cannot be identical to your current password.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await apiClient.post("/auth/reset-password", {
        email: resetEmail.trim(),
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMsg(res.data?.message || "Password reset successfully! You can now sign in with your new password.");
      setPassword(newPassword);
      setEmail(resetEmail.trim());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, "Failed to reset password. Please check your current password."));
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: Handle Launching the Selected Workspace
  const handleLaunchSelectedWorkspace = async () => {
    if (!selectedWorkspaceId) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
        tenantId: selectedWorkspaceId.toLowerCase().trim(),
        workspacePassword: workspacePassword.trim() || undefined,
      });

      if (res.data?.token) {
        localStorage.setItem("ledgerguard_auth_token", res.data.token);
        localStorage.setItem("ledgerguard_active_tenant", selectedWorkspaceId);
        localStorage.setItem("ledgerguard_user", JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user, selectedWorkspaceId);
      }
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, "Failed to launch selected workspace."));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Handle Creating & Launching a Brand New Workspace
  const handleCreateAndLaunchWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !newWorkspaceSlug.trim()) {
      setErrorMsg("Please provide both Workspace Name and ID Slug.");
      return;
    }
    if (!newWorkspaceHomeState) {
      setErrorMsg("Please select your Registered State (GST Home State).");
      return;
    }

    setIsCreatingWorkspace(true);
    setErrorMsg("");

    const cleanSlug = newWorkspaceSlug.toLowerCase().trim();

    try {
      await apiClient.post(
        "/tenants/provision",
        {
          tenantId: cleanSlug,
          name: newWorkspaceName.trim(),
          tier: "ENTERPRISE",
          homeState: newWorkspaceHomeState,
          workspacePassword: newWorkspacePassword.trim() || undefined,
        },
        pendingSessionToken
          ? { headers: { Authorization: `Bearer ${pendingSessionToken}` } }
          : undefined
      );

      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
        tenantId: cleanSlug,
        workspacePassword: newWorkspacePassword.trim() || undefined,
      });

      if (res.data?.token) {
        localStorage.setItem("ledgerguard_auth_token", res.data.token);
        localStorage.setItem("ledgerguard_active_tenant", cleanSlug);
        localStorage.setItem("ledgerguard_user", JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user, cleanSlug);
      }
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, "Failed to provision new workspace."));
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  return (
    <div className="min-h-[100dvh] lg:min-h-screen bg-slate-100 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative transition-colors duration-200">
      {/* Background Subtle Tech Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Floating Navbar Theme Mode Toggle */}
      <div className="w-full max-w-[880px] flex justify-end mb-2.5 lg:mb-0 lg:w-auto lg:absolute lg:top-6 lg:right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Main Split-Screen Container Card (Balanced & Compact) */}
      <div className="w-full max-w-[880px] bg-white dark:bg-[#0F172A] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2 lg:min-h-[600px] relative z-10 animate-pop">

        {/* ======================================================== */}
        {/* LEFT PART: Project Icon & Core Architecture Showcase     */}
        {/* ======================================================== */}
        <div className="order-2 lg:order-1 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden select-none border-t lg:border-t-0 lg:border-r border-slate-800">
          {/* Subtle ambient lighting glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand & Sentinel Logo */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 p-2 border border-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
                <img
                  src="/logos/logo-concept-3-sentinel.svg"
                  alt="LedgerGuard"
                  className="w-9 h-9 object-contain drop-shadow"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">LedgerGuard</h1>
                <p className="text-[11px] text-slate-400 font-medium">Autonomous Distributed ACID Invoicing</p>
              </div>
            </div>

            {/* Enterprise Security Architecture Showcase Card */}
            <div className="pt-1">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl backdrop-blur-md space-y-2.5 relative overflow-hidden">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Core Architecture</span>
                </div>

                {/* 3 Core Architectural Pillars */}
                <div className="space-y-2">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200">Distributed Redlock</div>
                      <div className="text-[10.5px] text-slate-400 leading-snug">
                        Sub-millisecond locking prevents duplicate billing & race conditions.
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200">Multi-Tenant Vaults</div>
                      <div className="text-[10.5px] text-slate-400 leading-snug">
                        Dedicated Atlas database partition per workspace with zero data leaks.
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200">RSA-256 Digital Seals</div>
                      <div className="text-[10.5px] text-slate-400 leading-snug">
                        Asymmetric cryptographic keys guarantee non-repudiation audit trails.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telemetry live indicators strip */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-[9.5px] text-slate-400 font-medium">Latency</div>
                    <div className="text-xs font-bold font-mono text-emerald-400">0.55ms</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-[9.5px] text-slate-400 font-medium">Integrity</div>
                    <div className="text-xs font-bold font-mono text-blue-400">100% ACID</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-[9.5px] text-slate-400 font-medium">Double-Spend</div>
                    <div className="text-xs font-bold font-mono text-purple-400">Zero</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance Tag */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 mt-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Bank-grade cryptographic isolation with instant ACID verification.</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PART: Login & Reset Password Forms                 */}
        {/* ======================================================== */}
        <div className="order-1 lg:order-2 p-5 sm:p-8 lg:p-9 flex flex-col justify-between bg-white dark:bg-[#0F172A] relative transition-colors duration-150">
          <div className="w-full max-w-[360px] mx-auto">
            {/* Error & Success Notification Banners */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium flex items-start gap-2 animate-fade-in">
                <div className="w-4 h-4 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">!</div>
                <div>{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>{successMsg}</div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1: SIGN IN VIEW                                     */}
            {/* ======================================================== */}
            {authStep === "LOGIN" && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in to LedgerGuard</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter your authorized work email and password to access your enterprise ledger.
                  </p>
                </div>

                {/* Quick 1-Click Fill Pill for Demo */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Admin Demo Credentials</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">admin@acme.com • admin123</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickFillAdmin}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 text-xs font-semibold transition shadow-2xs shrink-0"
                  >
                    Quick Fill
                  </button>
                </div>

                <form onSubmit={handleInitialLogin} className="space-y-4 pt-1">
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter work email (admin@acme.com)"
                        className="block w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      {/* Reset Password Link */}
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setErrorMsg("");
                          setSuccessMsg("");
                          setAuthStep("RESET_PASSWORD");
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Password?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="block w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        tabIndex={-1}
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 mt-6"
                  >
                    <span>{isLoading ? "Authenticating Session..." : "Sign In to Account"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP: RESET PASSWORD VIEW (User Request)                 */}
            {/* ======================================================== */}
            {authStep === "RESET_PASSWORD" && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setSuccessMsg("");
                    setAuthStep("LOGIN");
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold inline-flex items-center gap-1 mb-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reset Account Password</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter your current password, then specify and confirm your new password to update credentials.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3.5 pt-1">
                  {/* Target Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="admin@acme.com"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your existing password (admin123)"
                        className="block w-full pl-9 pr-9 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password (Min. 6 characters)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-blue-500" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new secure password"
                        className="block w-full pl-9 pr-9 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Check className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password to verify"
                        className={`block w-full pl-9 pr-9 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition ${
                          confirmPassword && newPassword !== confirmPassword
                            ? "border-red-300 dark:border-red-800 focus:border-red-500"
                            : "border-slate-200 dark:border-slate-700 focus:border-blue-500"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword === confirmPassword && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Passwords match perfectly
                      </span>
                    )}
                  </div>

                  {/* Reset Submit Action */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isResetting ? "Resetting Password..." : "Confirm & Save New Password"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthStep("LOGIN")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: CHOOSE WORKSPACE SCREEN                          */}
            {/* ======================================================== */}
            {authStep === "SELECT_WORKSPACE" && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Select Workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your account has access to <strong className="text-slate-800 dark:text-slate-200">{availableWorkspaces.length} workspaces</strong>. Choose where to log in:
                  </p>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto dropdown-scrollbar pr-1">
                  {availableWorkspaces.map((ws) => {
                    const isSelected = selectedWorkspaceId === ws.tenantId;

                    return (
                      <div
                        key={ws.tenantId}
                        onClick={() => setSelectedWorkspaceId(ws.tenantId)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all duration-150 flex items-center justify-between ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/15 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">{ws.name}</span>
                              {ws.isPasswordProtected && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                              ledgerguard_tenant_{ws.tenantId}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {availableWorkspaces.find((w) => w.tenantId === selectedWorkspaceId)?.isPasswordProtected && (
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5 animate-fade-in text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200 text-[11px]">
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Workspace Security Passcode Required</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showWorkspacePassword ? "text" : "password"}
                        autoFocus
                        value={workspacePassword}
                        onChange={(e) => {
                          setWorkspacePassword(e.target.value);
                          setErrorMsg("");
                        }}
                        placeholder="Enter workspace security password"
                        className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowWorkspacePassword(!showWorkspacePassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-amber-600/70 hover:text-amber-800 dark:text-amber-400/70 dark:hover:text-amber-300 transition"
                        tabIndex={-1}
                      >
                        {showWorkspacePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLaunchSelectedWorkspace}
                  disabled={isLoading || !selectedWorkspaceId}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
                >
                  <span>{isLoading ? "Entering Workspace..." : "Go to Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthStep("CREATE_WORKSPACE")}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthStep("LOGIN")}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Switch Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: CREATE WORKSPACE SCREEN                          */}
            {/* ======================================================== */}
            {authStep === "CREATE_WORKSPACE" && (
              <form onSubmit={handleCreateAndLaunchWorkspace} className="space-y-4 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Setup New Workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Spin up an isolated database cluster and dedicated partition for your team.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => {
                      setNewWorkspaceName(e.target.value);
                      if (!newWorkspaceSlug) {
                        setNewWorkspaceSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "_")
                            .slice(0, 20)
                        );
                      }
                    }}
                    placeholder="TeamNova Alpha"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Workspace Slug / Database ID
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceSlug}
                    onChange={(e) => setNewWorkspaceSlug(e.target.value)}
                    placeholder="teamnova_alpha"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="login-create-home-state" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered State (GST Home State)
                  </label>
                  <PremiumSelect
                    id="login-create-home-state"
                    value={newWorkspaceHomeState}
                    onChange={setNewWorkspaceHomeState}
                    options={WORKSPACE_HOME_STATE_OPTIONS}
                    placeholder="Please select state"
                    searchPlaceholder="Search state or GST code..."
                    searchable
                    clearable
                    clearAriaLabel="Clear selected state"
                    size="sm"
                    menuMaxHeight="max-h-44"
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    emptyMessage="No matching state found"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Workspace Password / PIN (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewWorkspacePassword ? "text" : "password"}
                      value={newWorkspacePassword}
                      onChange={(e) => setNewWorkspacePassword(e.target.value)}
                      placeholder="Leave blank for open access"
                      className="block w-full pl-3 pr-9 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewWorkspacePassword(!showNewWorkspacePassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showNewWorkspacePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingWorkspace}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 mt-4"
                >
                  <span>{isCreatingWorkspace ? "Provisioning Database..." : "Create & Launch Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAuthStep(availableWorkspaces.length > 0 ? "SELECT_WORKSPACE" : "LOGIN")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Footer Section */}
          <div className="w-full max-w-[360px] mx-auto pt-5 border-t border-slate-100 dark:border-slate-800 mt-5 space-y-2.5">
            {onOpenPublicVerification && (
              <button
                type="button"
                onClick={onOpenPublicVerification}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verify Client Tax Invoice (Public Portal)</span>
              </button>
            )}

            <div className="text-center text-[10.5px] text-slate-400 dark:text-slate-500">
              Protected by Upstash Redis Distributed Locks & MongoDB Atlas Isolation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
