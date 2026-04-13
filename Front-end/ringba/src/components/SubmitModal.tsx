import React, { useState } from "react";
import { X, PhoneOff, Plus, RefreshCw } from "lucide-react";
import { reportsApi } from "../api/reports";
import type { ScamReport } from "../types";

interface SubmitModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (report: ScamReport) => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    brand: "",
    phone_number: "",
    landing_url: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!form.brand || !form.phone_number) {
      setError("Brand and phone number are required.");
      return;
    }
    setLoading(true);
    try {
      const report = await reportsApi.createReport(form);
      onSuccess(report);
      setForm({ brand: "", phone_number: "", landing_url: "", notes: "" });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#2a2d3a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <PhoneOff size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">
                Submit Scam Report
              </h2>
              <p className="text-[#6b7280] text-xs mt-0.5">
                RespOrg lookup runs automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {[
            {
              key: "brand",
              label: "Target Brand",
              placeholder: "Microsoft, Amazon, IRS...",
            },
            {
              key: "phone_number",
              label: "Toll-Free Number",
              placeholder: "+1 888 555 0100",
            },
            {
              key: "landing_url",
              label: "Scam URL (optional)",
              placeholder: "https://fake-support.com",
            },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                {label}
              </label>
              <input
                className="w-full bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
              placeholder="How was it found? What was the script?"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#2a2d3a] text-[#9ca3af] text-sm hover:text-white hover:border-[#3a3d4a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitModal;