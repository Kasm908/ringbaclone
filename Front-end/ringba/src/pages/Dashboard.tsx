import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  Activity,
  Clock,
  Send,
  Skull,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { reportsApi } from "../api/reports";
import type { ScamReport, Stats } from "../types";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/ui/StatCard";
import ReportsTable from "../components/ReportsTable";
import SubmitModal from "../components/SubmitModal";
import LookupPanel from "../components/LookupPanel";

const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { user, logout } = useAuth();

  const PAGE_SIZE = 20;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [reportData, statsData] = await Promise.all([
        reportsApi.listReports({
          page,
          page_size: PAGE_SIZE,
          search,
          status: filterStatus,
        }),
        reportsApi.getStats(),
      ]);
      setReports(reportData.results);
      setTotal(reportData.total);
      setStats(statsData);
    } catch (err: any) {
      showToast(err.message || "Fetch failed", false);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const wsUrl = import.meta.env.VITE_WS_URL || "wss://scam-slayer-api.onrender.com";
    const ws = new WebSocket(
      `${wsUrl}/ws/reports/?token=${token}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setReports((prev) =>
        prev.map((r) => (r.id === data.id ? { ...r, ...data } : r))
      );
      fetchAll();
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    return () => {
      ws.close();
    };
  }, [fetchAll]);

  const handleAction = async (id: string, action: "report" | "kill") => {
    setActionLoading(`${id}-${action}`);
    try {
      const fn =
        action === "report" ? reportsApi.triggerReport : reportsApi.killReport;
      const result = await fn(id);
      showToast(result.message, result.success);
      if (result.success) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: result.new_status as any } : r
          )
        );
        fetchAll();
      }
    } catch (err: any) {
      showToast(err.message || "Action failed", false);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl transition-all ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <SubmitModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSuccess={(r) => {
          setReports((prev) => [r, ...prev]);
          showToast(
            `Report submitted — RespOrg: ${r.resporg_raw || "pending"}`,
            true
          );
          fetchAll();
        }}
      />

      {/* Header */}
      <header className="border-b border-[#1a1d2e] bg-[#0b0d14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Shield size={18} className="text-red-400" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight">
                Scam Slayer
              </span>
              <span className="text-[#4b5563] text-xs ml-2 font-mono">
                SOC Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#4b5563] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
            <span className="text-xs text-[#4b5563] font-mono">
              {user?.email} ({user?.role})
            </span>
            <button
              onClick={() => {
                setLoading(true);
                fetchAll();
              }}
              className="p-2 rounded-lg border border-[#1e2130] text-[#6b7280] hover:text-white hover:border-[#2a2d3a] transition-colors"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={() => setShowSubmit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Submit Report
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg border border-[#1e2130] text-[#6b7280] hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Reports"
              value={stats.total}
              icon={Activity}
              accent="bg-[#1e2130] text-[#6b7280]"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={Clock}
              accent="bg-amber-500/10 text-amber-400"
            />
            <StatCard
              label="Reported"
              value={stats.reported}
              icon={Send}
              accent="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              label="Killed"
              value={stats.killed}
              icon={Skull}
              accent="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              label="This Week"
              value={stats.this_week}
              icon={TrendingUp}
              accent="bg-purple-500/10 text-purple-400"
              sub={`of ${stats.total} total`}
            />
          </div>
        )}

        {/* Lookup Panel */}
        <LookupPanel
          onSubmit={async (data) => {
            try {
              const report = await reportsApi.createReport(data);
              setReports((prev) => [report, ...prev]);
              showToast(`Report submitted — ${report.phone_number}`, true);
              fetchAll();
            } catch (err: any) {
              showToast(
                err.response?.data?.detail || "Submit failed",
                false
              );
            }
          }}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]"
            />
            <input
              className="w-full bg-[#0f1117] border border-[#1e2130] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white font-mono placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
              placeholder="Search brand, number, URL..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex gap-2">
            {["", "pending", "reported", "killed", "failed"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => {
                  setFilterStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors ${
                  filterStatus === s
                    ? "bg-[#1e2130] border-[#3a3d4a] text-white"
                    : "border-[#1e2130] text-[#6b7280] hover:text-white hover:border-[#2a2d3a]"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-[#4b5563]" />
          </div>
        ) : (
          <ReportsTable
            reports={reports}
            actionLoading={actionLoading}
            onReport={(id) => handleAction(id, "report")}
            onKill={(id) => handleAction(id, "kill")}
          />
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4b5563] font-mono">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
              of {total} reports
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-[#1e2130] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-mono text-[#6b7280] px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-[#1e2130] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;