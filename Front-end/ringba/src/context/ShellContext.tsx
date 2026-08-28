import React, { createContext, useContext } from "react";

interface ShellContextValue {
  /** Show a transient toast in the top-right corner. */
  showToast: (msg: string, ok: boolean) => void;
  /** Open the "Submit Report" modal from anywhere in the app. */
  openSubmit: () => void;
  /** Bumped whenever report data changes so the Reports page can re-fetch. */
  reportsRefreshKey: number;
  /** Signal that reports data should be re-fetched. */
  bumpReports: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export const useShell = (): ShellContextValue => {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within a ShellProvider");
  return ctx;
};

interface ShellProviderProps {
  children: React.ReactNode;
  value: ShellContextValue;
}

/**
 * Provides cross-page chrome (toasts, the submit modal, and a refresh signal)
 * so individual section pages don't each have to own that shared state. The
 * layout owns the actual state and passes it in.
 */
export const ShellProvider: React.FC<ShellProviderProps> = ({ children, value }) => (
  <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
);
