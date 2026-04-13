import React, { useState } from "react";
import { Search, RefreshCw, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { reportsApi } from "../api/reports";

interface LookupResult {
  phone_number: string;
  carrier_name: string;
  resporg_code: string;
  abuse_email: string;
  landing_url: string;
  is_toll_free: boolean;
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
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");

  const isUrl = (val: string) =>
    val.startsWith("http://") || val.startsWith("https://");

  const handleLookup = async () => {
    setError("");
    setResult(null);
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await reportsApi.lookup({
        input: input.trim(),
        is_url: isUrl(input.trim()),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Lookup failed. Try entering the number manually.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="bg-[#0f1117] border border-[#1e2130] rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Search size={15} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white text-sm font-semibold">Number Lookup</h2>
          <p className="text-[#4b5563] text-xs font-mono">
            Paste a toll-free number or scam landing page URL
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          className="flex-1 bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-4 py-3 text-white text-sm font-mono placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
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
          className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {loading ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-xs font-mono">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border border-[#1e2130] rounded-xl overflow-hidden">
          <div className="bg-[#1a1d2e] px-5 py-3">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={13} />
              Number identified
            </span>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Toll-Free Number</p>
              <p className="text-white font-mono text-sm font-bold">
                {result.phone_number || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Carrier</p>
              <p className="text-white text-sm">{result.carrier_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">RespOrg ID</p>
              <p className="text-white font-mono text-sm bg-[#1a1d2e] px-2 py-1 rounded inline-block">
                {result.resporg_code || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4b5563] mb-1">Abuse Email</p>
              <p className="text-blue-400 text-xs font-mono">{result.abuse_email || "—"}</p>
            </div>
          </div>

          {/* Brand input + submit */}
          <div className="px-5 pb-5 flex gap-3">
            <input
              className="flex-1 bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
              placeholder="Which brand is being impersonated? (e.g. Microsoft, Yahoo)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={!brand.trim()}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={14} />
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupPanel;