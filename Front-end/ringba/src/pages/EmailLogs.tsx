import React, { useState, useEffect } from "react";
import {
  Mail, CheckCircle2, XCircle, Eye, RefreshCw, Search, X,
  Inbox, Send, AlertTriangle,
} from "lucide-react";
import { reportsApi } from "../api/reports";
import type { SentEmail } from "../types";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  abuse_complaint: "Abuse Complaint",
  ftc_report: "FTC Report",
  ic3_report: "IC3 Report",
  carrier_abuse: "Carrier Abuse",
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}> = ({ label, value, icon: Icon, accent }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
    </div>
    <span className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</span>
    <div
      className="absolute bottom-0 left-0 right-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
    />
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const sent = status === "sent";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${
        sent
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
          : "bg-red-500/10 border-red-500/20 text-red-600"
      }`}
    >
      {sent ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {sent ? "Sent" : "Failed"}
    </span>
  );
};

const EmailLogs: React.FC = () => {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError("");
    try {
      setEmails(await reportsApi.getAllEmails());
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load email logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const query = search.trim().toLowerCase();
  const filteredEmails = query
    ? emails.filter(
        (e) =>
          e.recipient.toLowerCase().includes(query) ||
          e.subject.toLowerCase().includes(query) ||
          e.cc_recipients.toLowerCase().includes(query)
      )
    : emails;

  const sentCount = emails.filter((e) => e.status === "sent").length;
  const failedCount = emails.filter((e) => e.status !== "sent").length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={fetchEmails}
            className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-medium transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Total Sent" value={emails.length} icon={Send} accent="#64748B" />
          <StatCard label="Successful" value={sentCount} icon={CheckCircle2} accent="#059669" />
          <StatCard label="Failed" value={failedCount} icon={XCircle} accent="#DC2626" />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl px-4 py-3 text-xs font-medium">
            <AlertTriangle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-all"
                placeholder="Search recipient or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-mono sm:ml-auto">
              {filteredEmails.length.toLocaleString()} record{filteredEmails.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {["Status", "Type", "Recipient", "Subject", "Sent", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <RefreshCw size={13} className="animate-spin" />
                        <span className="text-sm">Loading emails…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox size={26} className="text-slate-300" />
                        <span className="text-slate-400 text-sm">No emails found</span>
                        <span className="text-slate-400 text-xs font-mono">
                          {query ? "Try a different search" : "Sent emails will appear here"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map((email) => (
                    <tr
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <StatusBadge status={email.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-600">
                          {EMAIL_TYPE_LABELS[email.email_type] || email.email_type || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-slate-900">{email.recipient}</div>
                        {email.cc_recipients && (
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                            CC: {email.cc_recipients}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-900 text-sm block truncate max-w-[320px]">
                          {email.subject}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-500 font-mono">
                          {new Date(email.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          <br />
                          <span className="text-slate-400">
                            {new Date(email.sent_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEmail(email); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors text-xs font-medium"
                        >
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedEmail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-slate-900">Email details</span>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="divide-y divide-slate-200 overflow-y-auto max-h-[calc(80vh-56px)]">
              <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-slate-400 font-medium w-24 shrink-0">Status</span>
                <StatusBadge status={selectedEmail.status} />
              </div>
              <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-slate-400 font-medium w-24 shrink-0">Type</span>
                <span className="text-sm text-slate-900">
                  {EMAIL_TYPE_LABELS[selectedEmail.email_type] || selectedEmail.email_type || "—"}
                </span>
              </div>
              <div className="flex items-start gap-4 px-5 py-3">
                <span className="text-xs text-slate-400 font-medium w-24 shrink-0 pt-0.5">To</span>
                <span className="text-sm text-slate-900 font-mono break-all">{selectedEmail.recipient}</span>
              </div>
              {selectedEmail.cc_recipients && (
                <div className="flex items-start gap-4 px-5 py-3">
                  <span className="text-xs text-slate-400 font-medium w-24 shrink-0 pt-0.5">CC</span>
                  <span className="text-sm text-slate-600 font-mono break-all">{selectedEmail.cc_recipients}</span>
                </div>
              )}
              <div className="flex items-start gap-4 px-5 py-3">
                <span className="text-xs text-slate-400 font-medium w-24 shrink-0 pt-0.5">Subject</span>
                <span className="text-sm text-slate-900">{selectedEmail.subject}</span>
              </div>
              <div className="px-5 py-3">
                <span className="text-xs text-slate-400 font-medium block mb-2">Body</span>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-64 overflow-y-auto">
                  <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                    {selectedEmail.body_preview || "No body preview"}
                  </p>
                </div>
              </div>
              {selectedEmail.error_message && (
                <div className="px-5 py-3">
                  <span className="text-xs text-slate-400 font-medium block mb-2">Error</span>
                  <div className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 break-all">
                    {selectedEmail.error_message}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-slate-400 font-medium w-24 shrink-0">Sent at</span>
                <span className="text-sm text-slate-600 font-mono">
                  {new Date(selectedEmail.sent_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmailLogs;
