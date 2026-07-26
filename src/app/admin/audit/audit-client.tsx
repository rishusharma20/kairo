"use client";

import { useState } from "react";
import { fetchAuditLogsAction } from "./actions";
import { ShieldAlert, FileText, X, Loader2, Activity, User, Shield, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AuditLogType = {
  id: string;
  action: string;
  user_id: string | null;
  admin_id: string | null;
  metadata: string | null;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  } | null;
};

export function AuditClient({ initialLogs }: { initialLogs: AuditLogType[] }) {
  const [logs, setLogs] = useState<AuditLogType[]>(initialLogs);
  const [isSearching, setIsSearching] = useState(false);

  // Modal State
  const [viewLog, setViewLog] = useState<AuditLogType | null>(null);

  const handleRefresh = async () => {
    setIsSearching(true);
    try {
      const results = await fetchAuditLogsAction(100, 0);
      setLogs(results);
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("UPGRADED") || action.includes("UNBLOCKED")) {
      return "bg-success/10 text-success border-success/20";
    }
    if (action.includes("REJECTED") || action.includes("BLOCKED") || action.includes("DOWNGRADED") || action.includes("DELETED")) {
      return "bg-destructive/10 text-destructive border-destructive/20";
    }
    if (action.includes("PAYMENT_REQUEST")) {
      return "bg-warning/10 text-warning border-warning/20";
    }
    return "bg-[var(--surface)] text-text-primary border-[var(--border)]";
  };

  const renderTarget = (log: AuditLogType) => {
    if (log.user) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-text-primary truncate max-w-[200px]">{log.user.full_name}</span>
          <span className="text-xs text-text-muted truncate max-w-[200px]">{log.user.email}</span>
        </div>
      );
    }
    if (log.user_id) {
      return <span className="font-mono text-xs text-text-muted truncate max-w-[150px]">{log.user_id}</span>;
    }
    return <span className="text-xs text-text-muted italic">System</span>;
  };

  const parseMetadata = (metadataString: string | null) => {
    if (!metadataString) return null;
    try {
      return JSON.stringify(JSON.parse(metadataString), null, 2);
    } catch {
      return metadataString;
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="heading-md">Audit Logs</h1>
          <p className="text-text-muted">Read-only system activity and security tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isSearching}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-accent/50 hover:bg-accent/5 text-text-primary text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 min-w-[100px]"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </button>
        </div>
      </section>

      {/* List */}
      <div className="glass border border-[var(--border)] rounded-2xl overflow-hidden">
        
        {/* Desktop Table */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]/50 text-text-muted">
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Action</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Target</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Admin</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">{renderTarget(log)}</td>
                    <td className="px-6 py-4">
                      {log.admin_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-text-primary">
                          <Shield className="w-3 h-3 text-accent" />
                          {log.admin_id}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted italic">Automated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setViewLog(log)}
                        className="text-xs font-medium text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                        disabled={!log.metadata}
                      >
                        {log.metadata ? "View" : "-"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden flex flex-col divide-y divide-[var(--border)]">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No audit records found.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 space-y-4 hover:bg-[var(--surface)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getActionBadgeColor(log.action)}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-text-muted text-[10px]">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Target</p>
                    {renderTarget(log)}
                  </div>
                  
                  {log.metadata && (
                    <button 
                      onClick={() => setViewLog(log)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-text-primary text-xs font-medium"
                    >
                      Details
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Request Drawer/Modal */}
      <AnimatePresence>
        {viewLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewLog(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg glass border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" /> Audit Record Details
                </h3>
                <button onClick={() => setViewLog(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1"><User className="w-3 h-3"/> Target User</span>
                    {viewLog.user ? (
                      <p className="text-sm font-medium text-text-primary truncate">{viewLog.user.email}</p>
                    ) : (
                      <p className="text-sm font-medium text-text-muted italic">{viewLog.user_id || "N/A"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1"><Shield className="w-3 h-3"/> Administrator</span>
                    <p className="text-sm font-medium text-text-primary">{viewLog.admin_id || "System Action"}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1"><Calendar className="w-3 h-3"/> Precise Timestamp</span>
                    <p className="text-sm font-mono mt-1 text-text-primary">{new Date(viewLog.created_at).toISOString()}</p>
                  </div>
                </div>

                {/* Metadata Box */}
                {viewLog.metadata && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium flex items-center gap-1"><FileText className="w-3 h-3"/> Event Metadata</span>
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] overflow-x-auto">
                      <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap break-all">
                        {parseMetadata(viewLog.metadata)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Notice */}
                <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3 mt-4">
                  <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-text-muted leading-relaxed">
                    Audit logs are strictly read-only append-only records of authoritative system events. They cannot be modified or deleted.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
