import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  sub?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  className,
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 ${className ?? ""}`.trim()}>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

export default StatCard;