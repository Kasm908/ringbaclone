import React, { useState, useEffect } from "react";
import { Activity, Clock, Send, Skull, TrendingUp } from "lucide-react";
import { reportsApi } from "../api/reports";
import type { Stats } from "../types";

const StatCard = React.memo(
  ({ label, value, icon: Icon, accent, sub }: { label: string; value: number; icon: React.ElementType; accent: string; sub?: string }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</span>
        {sub && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sub}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
    </div>
  )
);
StatCard.displayName = "StatCard";

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
    ))}
  </div>
);

const Overview: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    reportsApi
      .getStats()
      .then((s) => active && setStats(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const statConfigs = [
    { label: "Total Reports", value: stats?.total || 0, icon: Activity, accent: "#64748B" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, accent: "#D97706" },
    { label: "Reported", value: stats?.reported || 0, icon: Send, accent: "#1E3A8A" },
    { label: "Killed", value: stats?.killed || 0, icon: Skull, accent: "#059669" },
    { label: "This Week", value: stats?.this_week || 0, icon: TrendingUp, accent: "#4338CA", sub: `of ${stats?.total || 0} total` },
  ];

  return (
    <div className="space-y-6">
      {!stats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statConfigs.map((config) => (
            <StatCard key={config.label} {...config} value={config.value} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Overview;
