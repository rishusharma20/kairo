"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // We can log the error to an error reporting service here if needed,
    // but we strictly do not expose it to the UI per the frozen spec.
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full glass border border-warning/20 p-8 rounded-2xl flex flex-col items-center text-center space-y-6">
        
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
          <ShieldAlert className="w-8 h-8 text-warning" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">
            Synchronization Interrupted
          </h2>
          <p className="text-sm text-text-muted">
            We encountered a secure network interruption while fetching your dashboard data. 
            This could be a temporary connection issue.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-warning/10 hover:bg-warning/20 text-warning text-sm font-medium transition-colors border border-warning/20"
        >
          <RefreshCcw className="w-4 h-4" />
          Attempt Reconnection
        </button>

      </div>
    </div>
  );
}
