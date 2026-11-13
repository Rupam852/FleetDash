import { useState, useEffect } from "react";
import { Header } from "./components/Header.js";
import { Sidebar } from "./components/Sidebar.js";
import { DashboardOverview } from "./views/DashboardOverview.js";
import { BillingLedgerView } from "./views/BillingLedgerView.js";
import { TenantsManagementView } from "./views/TenantsManagementView.js";
import { AnalyticsView } from "./views/AnalyticsView.js";
import { SecurityAuditView } from "./views/SecurityAuditView.js";
import { ApiKeysView } from "./views/ApiKeysView.js";
import { LoginPage } from "./views/LoginPage.js";
import { PublicInvoiceVerificationView } from "./views/PublicInvoiceVerificationView.js";
import { LoadingOverlay } from "./components/LoadingOverlay.js";
import { Tenant, Invoice, UsageMetrics, AuthUser } from "./types/index.js";
import { apiClient } from "./services/api.js";
import { getApiErrorCode, getApiErrorStatus } from "./utils/errors.js";

const ACTIVE_VIEW_STORAGE_KEY = "ledgerguard_active_view";
const VALID_VIEWS = new Set(["overview", "ledger", "tenants", "analytics", "security", "apikeys"]);

function getViewFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam && VALID_VIEWS.has(tabParam)) {
    return tabParam;
  }
  const hashView = window.location.hash.replace(/^#/, "");
  if (hashView && VALID_VIEWS.has(hashView)) {
    return hashView;
  }
  return null;
}

function getInitialView(): string {
  const fromUrl = getViewFromUrl();
  if (fromUrl) return fromUrl;
  try {
    const saved = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    if (saved && VALID_VIEWS.has(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "overview";
}

function buildViewUrl(view: string): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("verify");
  url.searchParams.delete("portal");
  if (view && view !== "overview") {
    url.searchParams.set("tab", view);
  } else {
    url.searchParams.delete("tab");
  }
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}

function decodeJwtPayload(token: string): { tenantId?: string; exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function loadStoredUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem("ledgerguard_user");
    return saved ? (JSON.parse(saved) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("ledgerguard_auth_token");
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(loadStoredUser);

  // Public Verification Portal State (triggered via ?verify=INV-XXXX, ?portal=verify, or from Login screen)
  const [publicVerifyInvoiceNum, setPublicVerifyInvoiceNum] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("verify") || "";
  });
  const [isPublicVerificationOpen, setIsPublicVerificationOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("verify")) || params.get("portal") === "verify";
  });

  const [currentTenant, setCurrentTenant] = useState<string>(() => {
    return localStorage.getItem("ledgerguard_active_tenant") || "acme_corp";
  });
  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<UsageMetrics>({
    totalRevenueCents: 0,
  });

  // Center Popup Loading Spinner State
  const [isLoadingOverlay, setIsLoadingOverlay] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>("Initializing LedgerGuard...");
  const [loadingSubText, setLoadingSubText] = useState<string>("Connecting to isolated database & verifying session...");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const clearAuthSession = () => {
    localStorage.removeItem("ledgerguard_auth_token");
    localStorage.removeItem("ledgerguard_user");
    localStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentView("overview");
    setInvoices([]);
    setTenants([]);
  };

  // Central Real Data Fetcher for logged-in user
  const loadUserData = async (tenantToLoad?: string) => {
    const targetTenant = tenantToLoad || currentTenant || "acme_corp";
    localStorage.setItem("ledgerguard_active_tenant", targetTenant);

    try {
      // 1. Fetch Master Registry tenants
      const tenantsRes = await apiClient.get("/tenants").catch((err) => {
        if (err?.response?.status === 401) {
          clearAuthSession();
        }
        return null;
      });
      if (!tenantsRes) return;
      if (tenantsRes.data?.tenants) {
        setTenants(tenantsRes.data.tenants);
      }

      // 2. Fetch Isolated Ledger Invoices from MongoDB Atlas
      const invoicesRes = await apiClient.get("/billing/invoices").catch(() => null);
      const fetchedInvoices: Invoice[] = invoicesRes?.data?.invoices || [];
      setInvoices(fetchedInvoices);

      const totalRevenueCents = fetchedInvoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0);
      setMetrics({ totalRevenueCents });
    } catch (err) {
      console.error("Error loading enterprise data:", err);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await apiClient.get("/tenants");
      if (res.data?.tenants) {
        setTenants(res.data.tenants);
      }
    } catch {
      // Offline fallback
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await apiClient.get("/billing/invoices");
      const fetchedInvoices: Invoice[] = res.data?.invoices || [];
      setInvoices(fetchedInvoices);

      const totalRevenueCents = fetchedInvoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0);
      setMetrics({ totalRevenueCents });
    } catch {
      // Offline fallback
    }
  };

  // Smooth View Navigation with Center Loading Spinner ONLY when switching to a DIFFERENT page
  const handleSelectView = async (targetView: string) => {
    const nextView = VALID_VIEWS.has(targetView) ? targetView : "overview";

    // Best Practice: If user is already on this page, do not trigger loading again
    if (nextView === currentView) {
      return;
    }

    const viewMetadata: Record<string, { title: string; sub: string }> = {
      overview: {
        title: "Loading Dashboard Overview...",
        sub: `Syncing real-time revenue & transaction metrics from MongoDB Atlas...`,
      },
      ledger: {
        title: "Fetching Live Invoices...",
        sub: `Querying isolated ledger transactions for workspace: ${currentTenant}...`,
      },
      tenants: {
        title: "Loading Workspaces Registry...",
        sub: "Fetching isolated database clusters & security credentials...",
      },
      analytics: {
        title: "Computing Telemetry & Usage...",
        sub: "Aggregating 12-hour throughput and quota consumption...",
      },
      security: {
        title: "Loading Cryptographic Vault...",
        sub: "Validating asymmetric RSA-256 keys & signature verification...",
      },
      apikeys: {
        title: "Loading Developer Credentials...",
        sub: "Fetching workspace API keys & webhook endpoints...",
      },
    };

    const meta = viewMetadata[nextView] || {
      title: "Loading View...",
      sub: "Fetching updated data from secure backend...",
    };

    setLoadingText(meta.title);
    setLoadingSubText(meta.sub);
    setIsLoadingOverlay(true);

    const startTime = Date.now();

    try {
      // Fetch latest real-time data for the active workspace
      await loadUserData(currentTenant);
    } catch (err) {
      console.error("Failed to refresh data on view switch:", err);
    } finally {
      // 2. Set current view and persist across refreshes + browser history
      setCurrentView(nextView);
      try {
        localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, nextView);
      } catch {
        // Ignore storage errors
      }
      const nextUrl = buildViewUrl(nextView);
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.pushState({ view: nextView }, "", nextUrl);
      }

      // 3. Keep smooth minimum duration (~450ms) so spinner is smoothly visible and UI doesn't stutter
      const elapsed = Date.now() - startTime;
      const minDuration = 450;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      setIsLoadingOverlay(false);
    }
  };

  // Smooth Tenant Context Switch with JWT refresh + real data fetching
  const handleTenantChange = async (tenantId: string, tokenAlreadyRefreshed?: boolean) => {
    setLoadingText("Switching Tenant Workspace...");
    setLoadingSubText(`Connecting to physical database: ledgerguard_${tenantId}`);
    setIsLoadingOverlay(true);

    const startTime = Date.now();

    try {
      if (tokenAlreadyRefreshed) {
        setAuthToken(localStorage.getItem("ledgerguard_auth_token"));
      } else {
        const switchRes = await apiClient.post("/auth/switch-workspace", { tenantId });
        if (switchRes.data?.token) {
          localStorage.setItem("ledgerguard_auth_token", switchRes.data.token);
          setAuthToken(switchRes.data.token);
        }
      }

      setCurrentTenant(tenantId);
      localStorage.setItem("ledgerguard_active_tenant", tenantId);

      await loadUserData(tenantId);
    } catch (err: unknown) {
      console.error("Failed to switch workspace:", err);
      const status = getApiErrorStatus(err);
      const code = getApiErrorCode(err);
      if (status === 401 && code && ["UNAUTHORIZED", "INVALID_TOKEN"].includes(code)) {
        clearAuthSession();
      }
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 650) {
        await new Promise((r) => setTimeout(r, 650 - elapsed));
      }

      setIsLoadingOverlay(false);
    }
  };

  // Smooth Login Transition with real data fetching
  const handleLoginSuccess = async (user: AuthUser, tenantId: string) => {
    setLoadingText(`Signing in as ${user.email}...`);
    setLoadingSubText(`Booting isolated MongoDB cluster: ledgerguard_${tenantId}`);
    setIsLoadingOverlay(true);

    const token = localStorage.getItem("ledgerguard_auth_token");
    const targetAfterLogin = getViewFromUrl() || "overview";
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentTenant(tenantId);
    setCurrentView(targetAfterLogin);
    localStorage.setItem("ledgerguard_active_tenant", tenantId);
    try {
      localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, targetAfterLogin);
    } catch {
      // Ignore storage errors
    }
    window.history.replaceState({ view: targetAfterLogin }, "", buildViewUrl(targetAfterLogin));

    const startTime = Date.now();
    await loadUserData(tenantId);

    const elapsed = Date.now() - startTime;
    if (elapsed < 800) {
      await new Promise((r) => setTimeout(r, 800 - elapsed));
    }

    setIsLoadingOverlay(false);
  };

  // Smooth Logout Transition
  const handleLogout = async () => {
    setLoadingText("Signing Out...");
    setLoadingSubText("Clearing secure enterprise session & credentials...");
    setIsLoadingOverlay(true);

    await new Promise((r) => setTimeout(r, 700));

    localStorage.removeItem("ledgerguard_auth_token");
    localStorage.removeItem("ledgerguard_user");
    localStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentView("overview");
    setInvoices([]);
    setTenants([]);
    window.history.replaceState({}, document.title, window.location.pathname);

    setIsLoadingOverlay(false);
  };

  // Initial mount / Tab Refresh: Fetch real data for logged-in user BEFORE closing spinner
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (authToken) {
        const decoded = decodeJwtPayload(authToken);
        if (!decoded || (decoded.exp && decoded.exp * 1000 <= Date.now())) {
          clearAuthSession();
          if (isMounted) {
            setIsLoadingOverlay(false);
          }
          return;
        }

        let tenantForSession = currentTenant;
        if (
          decoded.tenantId &&
          decoded.tenantId !== "*" &&
          decoded.tenantId.toLowerCase() !== currentTenant.toLowerCase()
        ) {
          try {
            const switchRes = await apiClient.post("/auth/switch-workspace", { tenantId: currentTenant });
            if (switchRes.data?.token) {
              localStorage.setItem("ledgerguard_auth_token", switchRes.data.token);
              setAuthToken(switchRes.data.token);
            }
          } catch {
            tenantForSession = decoded.tenantId.toLowerCase();
            setCurrentTenant(tenantForSession);
            localStorage.setItem("ledgerguard_active_tenant", tenantForSession);
          }
        }

        if (!isPublicVerificationOpen) {
          try {
            localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, currentView);
          } catch {
            // Ignore storage errors
          }
          const syncedUrl = buildViewUrl(currentView);
          if (`${window.location.pathname}${window.location.search}` !== syncedUrl) {
            window.history.replaceState({ view: currentView }, "", syncedUrl);
          }
        }

        setLoadingText("Restoring Enterprise Session...");
        setLoadingSubText(`Fetching ledger transactions from dedicated vault: ledgerguard_${tenantForSession}`);
        setIsLoadingOverlay(true);

        const startTime = Date.now();
        await loadUserData(tenantForSession);

        const elapsed = Date.now() - startTime;
        if (elapsed < 700) {
          await new Promise((r) => setTimeout(r, 700 - elapsed));
        }

        if (isMounted) {
          setIsLoadingOverlay(false);
        }
      } else {
        setIsLoadingOverlay(false);
      }
    };

    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync view & portal state on browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get("verify") || "";
      const isPortal = Boolean(verifyParam) || params.get("portal") === "verify";

      if (isPortal) {
        setPublicVerifyInvoiceNum(verifyParam);
        setIsPublicVerificationOpen(true);
        return;
      }

      setIsPublicVerificationOpen(false);
      const nextView = getViewFromUrl() || "overview";
      setCurrentView(nextView);
      try {
        localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, nextView);
      } catch {
        // Ignore storage errors
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <>
      {/* Center Popup Loading Spinner */}
      <LoadingOverlay
        isOpen={isLoadingOverlay}
        message={loadingText}
        subMessage={loadingSubText}
      />

      {/* If Public Verification is requested via URL (?verify=INV-...), ?portal=verify, or from Login screen */}
      {isPublicVerificationOpen ? (
        <PublicInvoiceVerificationView
          initialInvoiceNumber={publicVerifyInvoiceNum}
          onBackToLogin={() => {
            setIsPublicVerificationOpen(false);
            setPublicVerifyInvoiceNum("");
            const nextUrl = authToken ? buildViewUrl(currentView) : window.location.pathname;
            window.history.replaceState(authToken ? { view: currentView } : {}, document.title, nextUrl);
          }}
        />
      ) : !authToken ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenPublicVerification={() => {
            setIsPublicVerificationOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete("tab");
            url.searchParams.set("portal", "verify");
            window.history.pushState({ portal: "verify" }, "", `${url.pathname}?${url.searchParams.toString()}`);
          }}
        />
      ) : (
        <div className="flex flex-col h-[100dvh] lg:h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
          <Header
            currentTenant={currentTenant}
            tenants={tenants}
            onTenantChange={handleTenantChange}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar
              currentView={currentView}
              onSelectView={handleSelectView}
              userEmail={currentUser?.email}
              onLogout={handleLogout}
              isMobileOpen={isMobileMenuOpen}
              onMobileOpenChange={setIsMobileMenuOpen}
            />

            <main
              id="main-content"
              className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-[#0B0F17]/95 transition-colors duration-200"
            >
              <div className="max-w-6xl mx-auto">
                {currentView === "overview" && (
                  <DashboardOverview
                    currentTenant={currentTenant}
                    tenants={tenants}
                    metrics={metrics}
                    invoicesCount={invoices.length}
                    onOpenLedger={() => handleSelectView("ledger")}
                    onOpenTenants={() => handleSelectView("tenants")}
                  />
                )}
                {currentView === "ledger" && (
                  <BillingLedgerView
                    invoices={invoices}
                    currentTenant={currentTenant}
                    tenants={tenants}
                    onRefresh={fetchInvoices}
                  />
                )}
                {currentView === "tenants" && (
                  <TenantsManagementView
                    tenants={tenants}
                    onRefresh={() => {
                      fetchTenants();
                      fetchInvoices();
                    }}
                  />
                )}
                {currentView === "analytics" && (
                  <AnalyticsView currentTenant={currentTenant} invoices={invoices} />
                )}
                {currentView === "security" && (
                  <SecurityAuditView currentTenant={currentTenant} invoices={invoices} />
                )}
                {currentView === "apikeys" && (
                  <ApiKeysView currentTenant={currentTenant} />
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
