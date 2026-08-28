import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  Search,
  Globe,
  Megaphone,
  Radar,
  Mail,
  Shield,
  LogOut,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useShell } from "../../context/ShellContext";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: ListChecks },
  { to: "/lookup", label: "Number Lookup", icon: Search },
  { to: "/ad-library", label: "Ad Library", icon: Globe },
  { to: "/google-ads", label: "Google Ads", icon: Megaphone },
  { to: "/bulk-scan", label: "Bulk Scanner", icon: Radar },
  { to: "/emails", label: "Email Logs", icon: Mail },
];

interface SidebarProps {
  /** Whether the mobile drawer is open. */
  open: boolean;
  /** Close the mobile drawer. */
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const { openSubmit } = useShell();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
                <Shield size={15} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white animate-pulse" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-slate-900 font-bold text-sm tracking-tight">Scam Slayer</span>
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">SOC Portal</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* Submit report */}
        <div className="px-3 pt-4">
          <button
            onClick={() => {
              openSubmit();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 h-9 bg-[#1E3A8A] hover:bg-blue-800 rounded-lg text-white text-xs font-semibold transition-all shadow-lg shadow-blue-900/10"
          >
            <Plus size={13} /> Submit Report
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#1E3A8A]/10 text-[#1E3A8A]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-slate-200 p-3 shrink-0">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                {(user?.email || "?").charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-medium text-slate-900 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
