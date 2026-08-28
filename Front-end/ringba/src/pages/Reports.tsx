import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, RefreshCw, Search, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { reportsApi } from "../api/reports";
import type { ScamReport } from "../types";
import ReportsTable from "../components/ReportsTable";
import type { EmailPayload } from "../components/ReportsTable";
import { useShell } from "../context/ShellContext";

const PAGE_SIZE = 20;
const MAX_WEBSOCKET_RETRIES = 5;
const DEBOUNCE_DELAY = 500;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const STATUS_FILTERS = [
  { value: "", label: "All", color: "text-slate-600" },
  { value: "pending", label: "Pending", color: "text-amber-600" },
  { value: "reported", label: "Reported", color: "text-blue-600" },
  { value: "killed", label: "Killed", color: "text-emerald-600" },
  { value: "failed", label: "Failed", color: "text-red-600" },
];

const Reports: React.FC = () => {
  const { showToast, reportsRefreshKey } = useShell();
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [wsRetryCount, setWsRetryCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebounce(search, DEBOUNCE_DELAY);

  const fetchReports = useCallback(async () => {
    try {
      const data = await reportsApi.listReports({
        page, page_size: PAGE_SIZE, search: debouncedSearch, status: filterStatus,
      });
      setReports(data.results);
      setTotal(data.total);
    } catch (err: any) {
      showToast(err.message || "Fetch failed", false);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterStatus, showToast]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [fetchReports, reportsRefreshKey]);

  // Live updates over WebSocket.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const wsBase = import.meta.env.VITE_WS_URL || "wss://scam-slayer-api.onrender.com";
    let unmounted = false;

    const connect = (delay = 1000) => {
      if (unmounted) return;
      try {
        const ws = new WebSocket(`${wsBase}/ws/reports/?token=${token}`);
        wsRef.current = ws;
        ws.onopen = () => setWsRetryCount(0);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setReports((prev) => prev.map((r) => (r.id === data.id ? { ...r, ...data } : r)));
            fetchReports();
          } catch (err) {
            console.error("WebSocket message error:", err);
          }
        };
        ws.onclose = () => {
          if (unmounted) return;
          const nextDelay = Math.min(delay * 2, 30000);
          if (wsRetryCount < MAX_WEBSOCKET_RETRIES) {
            reconnectTimerRef.current = setTimeout(() => connect(nextDelay), delay);
            setWsRetryCount((prev) => prev + 1);
          }
        };
      } catch (err) {
        console.error("WebSocket connection error:", err);
      }
    };

    connect();
    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchReports, wsRetryCount]);

  const handleAction = async (id: string, action: "report" | "kill") => {
    setActionLoading(`${id}-${action}`);
    try {
      const fn = action === "report" ? reportsApi.triggerReport : reportsApi.killReport;
      const result = await fn(id);
      showToast(result.message, result.success);
      if (result.success) {
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: result.new_status as any } : r)));
        fetchReports();
      }
    } catch (err: any) {
      showToast(err.message || "Action failed", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmailReport = async (reportId: string, payload: EmailPayload) => {
    try {
      const res = await reportsApi.sendComplaint(reportId, payload);
      showToast(res.message || "Complaint email sent successfully", res.success !== false);
      if (res.screenshot && res.screenshot_mime && res.screenshot_filename) {
        const link = document.createElement("a");
        link.href = `data:${res.screenshot_mime};base64,${res.screenshot}`;
        link.download = res.screenshot_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      fetchReports();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to send email", false);
    }
  };

  const handleExport = async () => {
    try {
      await reportsApi.exportCsv();
    } catch (err: any) {
      showToast(err?.message || "Could not export reports.", false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-all"
              placeholder="Search brand, number, URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(({ value, label, color }) => (
              <button
                key={value || "all"}
                onClick={() => setFilterStatus(value)}
                className={`h-7 px-3 rounded-md text-[11px] font-mono font-medium border transition-all ${
                  filterStatus === value ? `bg-white border-slate-200 ${color}` : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-[11px] text-slate-400 font-mono">{total.toLocaleString()} records</span>
          <button onClick={handleExport} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 text-xs font-medium transition-all">
            <Download size={12} /> <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => { setLoading(true); fetchReports(); }} className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 text-xs transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw size={20} className="animate-spin text-slate-400" />
          <span className="text-xs text-slate-400 font-mono">Loading reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
            <Shield size={20} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-400">No reports found</p>
          <p className="text-xs text-slate-400 font-mono">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <ReportsTable
            reports={reports}
            actionLoading={actionLoading}
            onReport={(id) => handleAction(id, "report")}
            onKill={(id) => handleAction(id, "kill")}
            onEmailReport={handleEmailReport}
            onNotify={showToast}
          />
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-4">
          <span className="text-[11px] text-slate-400 font-mono">
            Showing <span className="text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="text-slate-500">{total.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
              <ChevronLeft size={13} />
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                let pages: number[] = [];
                if (totalPages <= 5) pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                else if (page <= 3) pages = [1, 2, 3, 4, 5];
                else if (page >= totalPages - 2) pages = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                else pages = [page - 2, page - 1, page, page + 1, page + 2];
                return pages.map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-all ${p === page ? "bg-white border border-slate-200 text-slate-900" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}>
                    {p}
                  </button>
                ));
              })()}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
