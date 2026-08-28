import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import SubmitModal from "../SubmitModal";
import { ShellProvider } from "../../context/ShellContext";
import { useAuth } from "../../context/AuthContext";

const TOKEN_CHECK_INTERVAL = 60000;

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Real-time scam intelligence dashboard" },
  "/reports": { title: "Reports", subtitle: "All submitted scam reports" },
  "/lookup": { title: "Number Lookup", subtitle: "Trace a number and submit a report" },
  "/ad-library": { title: "Ad Library", subtitle: "Search scam ads on Facebook" },
  "/google-ads": { title: "Google Ads", subtitle: "Search advertiser transparency center" },
  "/bulk-scan": { title: "Bulk Scanner", subtitle: "Harvest numbers from landing pages" },
  "/emails": { title: "Email Logs", subtitle: "All sent abuse emails" },
};

/** Crash guard so one broken page doesn't take down the whole shell. */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("Page error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-red-600">Something went wrong. Please refresh the page.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#1E3A8A] rounded-lg text-white text-sm">
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Shared application shell: a persistent sidebar for navigation plus a top bar,
 * with each section rendered into the <Outlet/> as its own routed page. The
 * toast, the Submit-Report modal, session-expiry checks and keyboard shortcuts
 * live here so every page inherits them.
 */
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const bumpReports = useCallback(() => setReportsRefreshKey((k) => k + 1), []);
  const openSubmit = useCallback(() => setShowSubmit(true), []);

  const shell = useMemo(
    () => ({ showToast, openSubmit, reportsRefreshKey, bumpReports }),
    [showToast, openSubmit, reportsRefreshKey, bumpReports]
  );

  // Log out automatically once the JWT expires.
  useEffect(() => {
    const checkToken = setInterval(() => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          logout();
          showToast("Session expired. Please login again.", false);
        }
      } catch (e) {
        console.error("Token check failed:", e);
      }
    }, TOKEN_CHECK_INTERVAL);
    return () => clearInterval(checkToken);
  }, [logout, showToast]);

  // Global keyboard shortcuts: ⌘/Ctrl+N submit, ⌘/Ctrl+R refresh, Esc close.
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowSubmit(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        bumpReports();
      }
      if (e.key === "Escape" && showSubmit) {
        setShowSubmit(false);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [bumpReports, showSubmit]);

  const meta = PAGE_TITLES[location.pathname] ?? { title: "", subtitle: "" };

  return (
    <ShellProvider value={shell}>
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl max-w-sm backdrop-blur-sm ${
              toast.ok
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                : "bg-red-500/10 border-red-500/20 text-red-600"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                toast.ok ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            >
              {toast.ok ? "✓" : "✗"}
            </span>
            {toast.msg}
          </div>
        )}

        <SubmitModal
          open={showSubmit}
          onClose={() => setShowSubmit(false)}
          onSuccess={(r) => {
            showToast(`Report submitted — RespOrg: ${r.resporg_raw || "pending"}`, true);
            bumpReports();
          }}
        />

        {/* Content area — offset by the fixed sidebar on desktop */}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-slate-100/90 backdrop-blur-xl flex items-center gap-3 px-5 sm:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">{meta.title}</h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">{meta.subtitle}</p>
            </div>
          </header>

          <main className="max-w-[1680px] mx-auto px-5 sm:px-8 py-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ShellProvider>
  );
};

export default AppLayout;
