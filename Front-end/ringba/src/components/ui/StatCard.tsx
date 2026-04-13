import React from "react";
import type{ LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}) => {
  return (
    <div className="bg-[#0f1117] border border-[#1e2130] rounded-xl p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white font-mono tabular-nums">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-[#6b7280] mt-0.5">{label}</div>
        {sub && <div className="text-xs text-[#4b5563] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

export default StatCard;