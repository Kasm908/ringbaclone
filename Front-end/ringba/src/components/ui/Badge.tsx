import React from "react";
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Status = "pending" | "reported" | "killed" | "failed";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
    icon: Clock,
  },
  reported: {
    label: "Reported",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    icon: Send,
  },
  killed: {
    label: "Killed",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
    icon: XCircle,
  },
};

interface BadgeProps {
  status: Status;
}

const Badge: React.FC<BadgeProps> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

export default Badge;