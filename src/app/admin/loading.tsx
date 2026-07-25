import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-destructive/20 flex items-center justify-center bg-destructive/5 backdrop-blur-md">
            <Loader2 className="w-6 h-6 text-destructive animate-spin" />
          </div>
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full -z-10 animate-pulse" />
        </div>
        
        <div className="space-y-2 text-center">
          <h2 className="text-sm font-medium tracking-[0.2em] text-text-primary uppercase">
            Accessing Control Center
          </h2>
          <p className="text-xs text-text-muted">
            Gathering system metrics...
          </p>
        </div>
      </div>
    </div>
  );
}
