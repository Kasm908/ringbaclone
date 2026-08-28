import React, { Suspense, lazy } from "react";
import { reportsApi } from "../api/reports";
import { useShell } from "../context/ShellContext";

const LookupPanel = lazy(() => import("../components/LookupPanel"));

const Lookup: React.FC = () => {
  const { showToast, bumpReports } = useShell();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <Suspense fallback={<div className="h-32 animate-pulse bg-white" />}>
        <LookupPanel
          onSubmit={async (data) => {
            try {
              const report = await reportsApi.createReport(data);
              showToast(`Report submitted — ${report.phone_number}`, true);
              bumpReports();
            } catch (err: any) {
              showToast(err.response?.data?.detail || "Submit failed", false);
            }
          }}
        />
      </Suspense>
    </div>
  );
};

export default Lookup;
