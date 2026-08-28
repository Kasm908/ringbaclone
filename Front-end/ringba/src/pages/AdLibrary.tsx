import React, { Suspense, lazy } from "react";

const AdLibraryPanel = lazy(() => import("../components/AddLibraryPanel"));

const AdLibrary: React.FC = () => (
  <Suspense fallback={<div className="h-40 animate-pulse bg-white rounded-xl" />}>
    <AdLibraryPanel />
  </Suspense>
);

export default AdLibrary;
