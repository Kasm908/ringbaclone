import React from "react";
import {
  ExternalLink,
  Send,
  Skull,
  RefreshCw,
} from "lucide-react";
import type { ScamReport } from "../types";
import Badge from "./ui/Badge";
import type { href } from "react-router-dom";

interface ReportsTableProps {
  reports: ScamReport[];
  actionLoading: string | null;
  onReport: (id: string) => void;
  onKill: (id: string) => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  actionLoading,
  onReport,
  onKill,
}) => {
  return (
    <div className="bg-[#0f1117] border border-[#1e2130] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1d2e]">
              {[
                "Target Brand",
                "Toll-Free Number",
                "RespOrg",
                "Carrier",
                "Landing Page",
                "Status",
                "Detected",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-xs font-medium text-[#4b5563] uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[#4b5563] text-sm">
                      No reports found
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((r) => {
                const isActing = actionLoading?.startsWith(r.id);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#1a1d2e] hover:bg-[#111420] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#1a1d2e] flex items-center justify-center text-[10px] font-bold text-[#6b7280]">
                          {r.brand.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white text-sm">
                          {r.brand}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[#e2e8f0] text-sm tracking-wide">
                        {r.phone_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-[#6b7280] bg-[#1a1d2e] px-2 py-1 rounded">
                        {r.resporg_raw || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[#9ca3af] text-xs">
                        {r.resporg?.carrier_name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                    {r.landing_url ? (
                        <a
                        href={r.landing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-blue-300 font-mono transition-colors"
                        >
                        <ExternalLink size={10} />
                        {r.landing_url.replace(/^https?:\/\//, "").slice(0, 28)}
                        {r.landing_url.length > 36 ? "…" : ""}
                        </a>
                    ) : (
                        <span className="text-[#374151] text-xs">—</span>
                    )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={r.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-[#6b7280] font-mono">
                        {new Date(r.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        <br />
                        <span className="text-[#374151]">
                          {new Date(r.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {r.status !== "killed" &&
                          r.status !== "reported" && (
                            <button
                              onClick={() => onReport(r.id)}
                              disabled={!!isActing}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors text-xs font-medium"
                            >
                              {isActing &&
                              actionLoading === `${r.id}-report` ? (
                                <RefreshCw
                                  size={11}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send size={11} />
                              )}
                              Report
                            </button>
                          )}
                        {r.status !== "killed" && (
                          <button
                            onClick={() => onKill(r.id)}
                            disabled={!!isActing}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors text-xs font-medium"
                          >
                            {isActing &&
                            actionLoading === `${r.id}-kill` ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Skull size={11} />
                            )}
                            Kill
                          </button>
                        )}
                        {r.status === "killed" && (
                          <span className="text-xs text-[#374151] font-mono">
                            Terminated
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsTable;