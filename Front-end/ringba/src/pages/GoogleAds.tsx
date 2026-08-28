import React, { Suspense, lazy } from "react";

const GoogleAdsPanel = lazy(() => import("../components/GoogleAdsPanel"));

const GoogleAds: React.FC = () => (
  <Suspense fallback={<div className="h-40 animate-pulse bg-white rounded-xl" />}>
    <GoogleAdsPanel />
  </Suspense>
);

export default GoogleAds;
