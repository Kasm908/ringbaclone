import React, { useState } from "react";
import {ExternalLink, Globe } from "lucide-react";

const AdLibraryPanel: React.FC = () => {
  const [domain, setDomain] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const handleSearch = () => {
    if (!domain.trim() && !campaignId.trim()) return;

    if (campaignId.trim()) {
      window.open(
        `https://www.facebook.com/ads/library/?id=${campaignId.trim()}`,
        "_blank"
      );
    } else {
      const clean = domain
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0]
        .split("?")[0];
      window.open(
        `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=${clean}&search_type=keyword_unordered`,
        "_blank"
      );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Globe size={15} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-slate-900 text-sm font-semibold">Facebook Ad Library</h2>
          <p className="text-slate-400 text-xs font-mono">Search for scam ads running on Facebook</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm font-mono placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] transition-colors"
          placeholder="Domain — e.g. scam-site.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <input
          className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm font-mono placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] transition-colors"
          placeholder="Campaign ID (optional)"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={!domain.trim() && !campaignId.trim()}
          className="w-full sm:w-auto px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink size={14} />
          Search on Facebook
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <p className="text-slate-500 text-xs leading-relaxed">
          Enter a scam domain or campaign ID. Clicking Search opens Facebook Ad Library directly with results pre-loaded. If a campaign ID is found in the URL params it will be auto-filled.
        </p>
      </div>
    </div>
  );
};

export default AdLibraryPanel;