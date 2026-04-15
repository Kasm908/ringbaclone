import React, { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Plus, AlertCircle, CheckCircle2, Loader } from "lucide-react";
import { reportsApi } from "../api/reports";

interface LookupResult {
  lookup_id: string;
  phone_number: string;
  carrier_name: string;
  resporg_code: string;
  abuse_email: string;
  landing_url: string;
  is_toll_free: boolean;
  campaign_id: string;
  domain: string;
  scraping: boolean;
}

interface LookupPanelProps {
  onSubmit: (data: {
    brand: string;
    phone_number: string;
    landing_url: string;
  }) => void;
}

const LookupPanel: React.FC<LookupPanelProps> = ({ onSubmit }) => {
  const [input, setInput] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const isUrl = (val: string) =>
    val.startsWith("http://") || val.startsWith("https://");

  const handleLookup = async () => {
    setError("");
    setResult(null);
    setScraping(false);
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await reportsApi.lookup({
        input: input.trim(),
        is_url: isUrl(input.trim()),
      });
      setResult(res);

      if (res.scraping && res.lookup_id) {
        setScraping(true);
        listenForPhoneNumber(res.lookup_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const listenForPhoneNumber = (lookupId: string) => {
    const token = localStorage.getItem("access_token");
    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/reports/?token=${token}`
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "lookup_result" && data.lookup_id === lookupId) {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                phone_number: data.phone_number,
                carrier_name: data.carrier_name,
                resporg_code: data.resporg_code,
                abuse_email: data.abuse_email,
                is_toll_free: data.is_toll_free,
                scraping: false,
              }
            : prev
        );
        setScraping(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setScraping(false);
    };
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleSubmit = () => {
    if (!result || !brand.trim()) return;
    onSubmit({
      brand,
      phone_number: result.phone_number,
      landing_url: result.landing_url,
    });
    setInput("");
    setBrand("");
    setResult(null);
  };

  return (
    <div className="bg-[#0f1117] border border-[#1e2130] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Search size={15} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-white text-sm font-semibold">Number Lookup</h2>
          <p className="text-[#4b5563] text-xs font-mono hidden sm:block">
            Paste a toll-free number or scam landing page URL
          </p>
          <p className="text-[#4b5563] text-xs font-mono sm:hidden">
            Paste number or URL
          </p>
        </div>
      </div>

      {/* Input Row - Stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          className="flex-1 bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-3 sm:px-4 py-3 text-white text-sm font-mono placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
          placeholder="+1 888 555 0100 or https://scam-site.com"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <button
          onClick={handleLookup}
          disabled={loading || !input.trim()}
          className="w-full sm:w-auto px-4 sm:px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          <span className="sm:hidden">{loading ? "Looking..." : "Lookup"}</span>
          <span className="hidden sm:inline">{loading ? "Looking up..." : "Lookup"}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-3 text-red-400 text-xs font-mono">
          <AlertCircle size={13} className="shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border border-[#1e2130] rounded-xl overflow-hidden">
          {/* Status Header */}
          <div className="bg-[#1a1d2e] px-3 sm:px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-2 min-w-0">
              <CheckCircle2 size={13} className="shrink-0" />
              <span className="truncate">
                {scraping ? "URL identified — scraping..." : "Lookup complete"}
              </span>
            </span>
            {scraping && <Loader size={13} className="animate-spin text-amber-400 shrink-0" />}
          </div>

          {/* Data Grid - 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Phone Number</p>
              {scraping && !result.phone_number ? (
                <div className="h-4 w-32 bg-[#1a1d2e] rounded animate-pulse" />
              ) : (
                <p className="text-white font-mono text-sm font-bold break-all">
                  {result.phone_number || "Not found on page"}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Carrier</p>
              {scraping && !result.carrier_name ? (
                <div className="h-4 w-24 bg-[#1a1d2e] rounded animate-pulse" />
              ) : (
                <p className="text-white text-sm break-words">{result.carrier_name || "—"}</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Type</p>
              {scraping && !result.is_toll_free ? (
                <div className="h-4 w-20 bg-[#1a1d2e] rounded animate-pulse" />
              ) : (
                <p className={`text-white font-mono text-sm px-2 py-1 rounded inline-block ${result.is_toll_free ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {result.is_toll_free ? "Toll-Free" : "Non-Toll"}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Abuse Email</p>
              {scraping && !result.abuse_email ? (
                <div className="h-4 w-36 bg-[#1a1d2e] rounded animate-pulse" />
              ) : (
                <p className="text-blue-400 text-xs font-mono break-all">{result.abuse_email || "—"}</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Campaign ID</p>
              <p className="text-amber-400 font-mono text-sm break-all">{result.campaign_id || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#4b5563] mb-1">Domain</p>
              <p className="text-white text-sm font-mono break-all">{result.domain || "—"}</p>
            </div>
          </div>

          {/* Submit Row - Stack on mobile */}
          <div className="px-3 sm:px-5 pb-3 sm:pb-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              className="flex-1 bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-3 sm:px-4 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
              placeholder="Which brand is being impersonated? (e.g. Microsoft)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={!brand.trim() || scraping || !result.is_toll_free}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={14} />
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupPanel;