import React, { useState, useEffect, useRef } from "react";
import {
  Radar, RefreshCw, Play, ChevronDown, ChevronUp, Copy, Check,
  ShieldAlert, Ban, AlertTriangle, ScanLine, Activity,
} from "lucide-react";
import { reportsApi } from "../api/reports";
import type { ScanResult, ScanStatus, BulkScanProgress } from "../types";

const POLL_MS = 2000;

const STATUS_STYLES: Record<ScanStatus, { label: string; className: string; Icon: React.ElementType }> = {
  SCANNED:  { label: "Scanned",   className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600", Icon: ScanLine },
  DEAD_DNS: { label: "Dead",      className: "bg-slate-500/10 border-slate-300 text-slate-500",          Icon: Ban },
  BLOCKED:  { label: "Blocked",   className: "bg-amber-500/10 border-amber-500/20 text-amber-600",       Icon: ShieldAlert },
  INVALID:  { label: "Invalid",   className: "bg-amber-500/10 border-amber-500/20 text-amber-600",       Icon: AlertTriangle },
  ERROR:    { label: "Error",     className: "bg-red-500/10 border-red-500/20 text-red-600",             Icon: AlertTriangle },
};

const StatusChip: React.FC<{ status: ScanStatus }> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.ERROR;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${s.className}`}>
      <s.Icon size={11} /> {s.label}
    </span>
  );
};

const ResultRow: React.FC<{ result: ScanResult }> = ({ result }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(""), 1500);
  };

  const hasDetail = result.harvested_numbers.length > 0 || result.telemetry.length > 0 || !!result.error;
  const host = result.url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hasDetail ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"} transition-colors`}
      >
        <StatusChip status={result.status} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs text-slate-900 truncate">{host}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {result.status_code !== null && (
              <span className="text-[11px] text-slate-400 font-mono">HTTP {result.status_code}</span>
            )}
            <span className="text-[11px] text-slate-400 font-mono">
              {result.harvested_numbers.length} number{result.harvested_numbers.length === 1 ? "" : "s"}
            </span>
            {result.telemetry_total > 0 && (
              <span className="text-[11px] text-slate-400 font-mono">{result.telemetry_total} endpoints</span>
            )}
            {result.ocr_used && (
              <span className="text-[11px] text-blue-600 font-mono">via OCR</span>
            )}
          </div>
        </div>
        {hasDetail && (open
          ? <ChevronUp size={13} className="text-slate-400 shrink-0" />
          : <ChevronDown size={13} className="text-slate-400 shrink-0" />)}
      </button>

      {open && hasDetail && (
        <div className="px-4 pb-4 space-y-3 bg-slate-50/60">
          {result.error && (
            <p className="text-[11px] text-red-600 font-mono break-all">{result.error}</p>
          )}

          {result.harvested_numbers.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                Harvested numbers
              </p>
              <div className="space-y-1">
                {result.harvested_numbers.map((n) => (
                  <div key={n.number} className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => copy(n.number)}
                      title="Copy number"
                      className="flex items-center gap-1.5 font-mono text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {copied === n.number ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      {n.number}
                    </button>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 text-[11px]">{n.carrier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.telemetry.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                Captured endpoints
                {result.telemetry_total > result.telemetry.length &&
                  ` (${result.telemetry.length} of ${result.telemetry_total})`}
              </p>
              <div className="bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                {result.telemetry.map((ep, i) => (
                  <p key={i} className="text-[11px] text-slate-500 font-mono px-2.5 py-1.5 break-all">{ep}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BulkScanPanel: React.FC = () => {
  const [input, setInput] = useState("");
  const [progress, setProgress] = useState<BulkScanProgress | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const urls = input
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean);

  const startScan = async () => {
    if (urls.length === 0) return;
    setScanning(true);
    setError("");
    setNotice("");
    setProgress(null);
    stopPolling();

    try {
      const { scan_id, message } = await reportsApi.startBulkScan(urls);
      setNotice(message);

      pollRef.current = setInterval(async () => {
        try {
          const data = await reportsApi.getBulkScan(scan_id);
          setProgress(data);
          if (data.done || data.expired) {
            stopPolling();
            setScanning(false);
            if (data.expired) setError("Scan expired before it finished. Try a smaller batch.");
          }
        } catch {
          stopPolling();
          setScanning(false);
          setError("Lost contact with the scan.");
        }
      }, POLL_MS);
    } catch (err: any) {
      setScanning(false);
      setError(err?.response?.data?.detail || "Could not start the scan.");
    }
  };

  const results = progress?.results ?? [];
  const totalNumbers = results.reduce((n, r) => n + r.harvested_numbers.length, 0);
  const pct = progress && progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0;

  return (
    <div>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <Radar size={14} className="text-blue-600" />
        <span className="text-sm font-medium text-slate-900">Bulk Page Scanner</span>
        <span className="text-[11px] text-slate-400 font-mono ml-auto">
          numbers · carriers · telemetry
        </span>
      </div>

      <div className="p-5 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder={"Paste landing page URLs — one per line\nhttps://example-scam-lander.com/?gclid=…"}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-all resize-y"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={startScan}
            disabled={scanning || urls.length === 0}
            className="flex items-center gap-2 h-9 px-4 bg-[#1E3A8A] hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all"
          >
            {scanning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {scanning ? "Scanning…" : `Scan ${urls.length || ""} URL${urls.length === 1 ? "" : "s"}`.trim()}
          </button>

          {results.length > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <Activity size={11} className="text-emerald-600" />
              {totalNumbers} number{totalNumbers === 1 ? "" : "s"} across {results.length} page
              {results.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {notice && !error && (
          <p className="text-[11px] text-slate-400 font-mono">{notice}</p>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle size={12} className="shrink-0" /> {error}
          </div>
        )}

        {progress && progress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{progress.scanned} of {progress.total} scanned</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1E3A8A] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {results.map((r) => <ResultRow key={r.url} result={r} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkScanPanel;
