import React, { Suspense, lazy } from "react";

const BulkScanPanel = lazy(() => import("../components/BulkScanPanel"));

const BulkScan: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <Suspense fallback={<div className="h-32 animate-pulse bg-white" />}>
      <BulkScanPanel />
    </Suspense>
  </div>
);

export default BulkScan;
