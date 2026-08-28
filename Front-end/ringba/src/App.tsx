import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AppLayout from "./components/layout/AppLayout";
import Overview from "./pages/Overview";
import Reports from "./pages/Reports";
import Lookup from "./pages/Lookup";
import AdLibrary from "./pages/AdLibrary";
import GoogleAds from "./pages/GoogleAds";
import BulkScan from "./pages/BulkScan";
import EmailLogs from "./pages/EmailLogs";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Every section is its own page, rendered inside the sidebar layout. */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/lookup" element={<Lookup />} />
        <Route path="/ad-library" element={<AdLibrary />} />
        <Route path="/google-ads" element={<GoogleAds />} />
        <Route path="/bulk-scan" element={<BulkScan />} />
        <Route path="/emails" element={<EmailLogs />} />
      </Route>

      <Route
        path="*"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
