import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Mail, Lock, AlertCircle, Loader } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#1E3A8A] border border-[#1E3A8A] flex items-center justify-center mb-5">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold tracking-tight">
            Fraud Hunter
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            Security Operations Portal
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-slate-900 text-sm font-semibold mb-6 text-center">
            Sign in to your account
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-600 text-xs font-mono mb-4">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] transition-colors"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] transition-colors"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E3A8A] hover:bg-[#16306E] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Shield size={14} />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-slate-400 text-xs text-center mt-5">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#1E3A8A] hover:text-[#16306E] font-medium transition-colors"
            >
              Register
            </Link>
          </p>
        </div>

        <p className="text-slate-300 text-xs text-center mt-6 font-mono">
          Fraud Hunter Portal v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;