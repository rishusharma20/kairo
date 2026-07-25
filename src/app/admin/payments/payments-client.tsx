"use client";

import { useState } from "react";
import { fetchPaymentsAction, approvePaymentAction, rejectPaymentAction } from "./actions";
import { Search, ShieldAlert, CheckCircle2, XCircle, Clock, FileText, X, AlertTriangle, Loader2, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type PaymentRequestType = {
  id: string;
  user_id: string | null;
  utr: string;
  targetPlan: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at: string;
  user: {
    full_name: string;
    email: string;
    plan: string;
  } | null;
};

export function PaymentsClient({ initialPayments }: { initialPayments: PaymentRequestType[] }) {
  const [payments, setPayments] = useState<PaymentRequestType[]>(initialPayments);
  const [statusFilter, setStatusFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Modal State
  const [viewPayment, setViewPayment] = useState<PaymentRequestType | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; payment: PaymentRequestType } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRefresh = async () => {
    setIsSearching(true);
    try {
      const results = await fetchPaymentsAction(statusFilter ? (statusFilter as any) : undefined);
      setPayments(results);
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const executeAction = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    setErrorMsg("");
    
    try {
      if (actionModal.type === 'approve') {
        await approvePaymentAction(actionModal.payment.id);
      } else {
        await rejectPaymentAction(actionModal.payment.id);
      }
      
      // Re-fetch all to ensure strict authoritative state sync
      await handleRefresh();
      
      // Close view modal if it was open for the same payment
      if (viewPayment && viewPayment.id === actionModal.payment.id) {
        setViewPayment(null);
      }
      setActionModal(null);
    } catch (error: any) {
      setErrorMsg(error.message || `An error occurred during ${actionModal.type}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return 'bg-success/10 text-success border border-success/20';
    if (status === 'REJECTED') return 'bg-destructive/10 text-destructive border border-destructive/20';
    return 'bg-warning/10 text-warning border border-warning/20';
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="heading-md">Payment Requests</h1>
          <p className="text-text-muted">Manually verify user UTR submissions and upgrade accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              // In a real app we might auto-refresh here, but manual refresh is safer for admins.
            }}
            className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-accent text-text-primary"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
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
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">User</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">UTR</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Submitted</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                payments.map((req) => (
                  <tr key={req.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-6 py-4">
                      {req.user ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary truncate max-w-[200px]">{req.user.full_name}</span>
                          <span className="text-xs text-text-muted truncate max-w-[200px]">{req.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">Deleted User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-text-primary bg-[var(--surface)] px-2 py-1 rounded border border-[var(--border)]">
                        {req.utr}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${getStatusBadge(req.status)}`}>
                        {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {new Date(req.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setViewPayment(req)}
                        className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                      >
                        Review
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
          {payments.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No payment requests found.
            </div>
          ) : (
            payments.map((req) => (
              <div key={req.id} className="p-4 space-y-4 hover:bg-[var(--surface)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  {req.user ? (
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-text-primary truncate">{req.user.full_name}</span>
                      <span className="text-xs text-text-muted truncate">{req.user.email}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted italic">Deleted User</span>
                  )}
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-primary bg-[var(--surface)] px-2 py-1 rounded border border-[var(--border)]">
                    UTR: {req.utr}
                  </span>
                  <button 
                    onClick={() => setViewPayment(req)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-text-primary text-xs font-medium"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Request Drawer/Modal */}
      <AnimatePresence>
        {viewPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewPayment(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg glass border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-text-muted" /> Payment Review
                </h3>
                <button onClick={() => setViewPayment(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">User</span>
                    <p className="text-sm font-medium text-text-primary break-words">{viewPayment.user ? viewPayment.user.full_name : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Email</span>
                    <p className="text-sm font-medium text-text-primary break-all">{viewPayment.user ? viewPayment.user.email : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Current Plan</span>
                    <p className="text-sm font-bold mt-1">
                      {viewPayment.user ? (
                        <span className={viewPayment.user.plan.includes('PREMIUM') ? 'text-accent' : 'text-text-muted'}>
                          {viewPayment.user.plan.replace(/_/g, ' ')}
                        </span>
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Requested Plan</span>
                    <p className="text-sm font-bold mt-1 text-accent">
                      {viewPayment.targetPlan.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Submission Time</span>
                    <p className="text-sm font-medium mt-1 text-text-primary">{new Date(viewPayment.submitted_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* UTR & Status Box */}
                <div className="p-4 rounded-xl bg-[var(--surface)]/50 border border-[var(--border)] space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Transaction UTR</span>
                    <div className="font-mono text-base font-medium text-text-primary break-all bg-[var(--background)] px-3 py-2 rounded border border-[var(--border)]">
                      {viewPayment.utr}
                    </div>
                  </div>
                  
                  <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Current Status</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase ${getStatusBadge(viewPayment.status)}`}>
                        {viewPayment.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {viewPayment.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {viewPayment.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        {viewPayment.status}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-4">Manual Verification Decision</h4>
                  
                  {viewPayment.status === "PENDING" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={() => setActionModal({ type: 'reject', payment: viewPayment })}
                        className="px-4 py-2.5 bg-[var(--surface)] text-text-primary border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject Payment
                      </button>
                      <button 
                        onClick={() => setActionModal({ type: 'approve', payment: viewPayment })}
                        className="px-4 py-2.5 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm font-medium hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve & Upgrade
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-text-muted shrink-0" />
                      <p className="text-xs text-text-muted">
                        This payment has been fully processed. The frozen Kairo rules forbid reopening or reversing an {viewPayment.status} request from this interface.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass border border-[var(--border)] rounded-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full border ${
                  actionModal.type === 'reject' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                  'bg-success/10 border-success/20 text-success'
                }`}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-text-primary capitalize">
                    {actionModal.type} Payment
                  </h3>
                  <p className="text-sm text-text-muted mt-2">
                    Are you sure you want to {actionModal.type} this payment?
                  </p>
                  
                  <div className="font-mono text-xs text-text-primary bg-[var(--background)] p-2 rounded border border-[var(--border)] mt-3">
                    UTR: {actionModal.payment.utr}
                  </div>

                  {actionModal.type === 'approve' && (
                    <p className="text-xs text-success mt-3 bg-success/5 p-2 rounded border border-success/10">
                      The user will be immediately upgraded to {actionModal.payment.targetPlan.replace(/_/g, ' ')}.
                    </p>
                  )}
                  {actionModal.type === 'reject' && (
                    <p className="text-xs text-destructive mt-3 bg-destructive/5 p-2 rounded border border-destructive/10">
                      This will finalize the request as REJECTED. The user will remain FREE.
                    </p>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setActionModal(null); setErrorMsg(""); }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-[var(--surface)] text-text-primary text-sm font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--surface)]/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeAction}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    actionModal.type === 'reject' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' :
                    'bg-success/20 text-success hover:bg-success/30'
                  }`}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
