"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full glass border border-destructive/20 p-8 rounded-2xl flex flex-col items-center text-center space-y-6">
        
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">
            System Metric Failure
          </h2>
          <p className="text-sm text-text-muted">
            The control center encountered an unexpected error while aggregating data. 
            No sensitive information was exposed.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors border border-destructive/20"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry Aggregation
        </button>

      </div>
    </div>
  );
}
