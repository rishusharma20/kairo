"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, CreditCard, Loader2, QrCode, ShieldAlert, X } from "lucide-react";
import { submitPaymentAction, checkPendingPaymentAction } from "./actions";

interface BillingClientProps {
  user: {
    plan: string;
    daily_limit: number;
  };
}

export default function BillingClient({ user }: BillingClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [utr, setUtr] = useState("");
  const [targetPlan, setTargetPlan] = useState<"PREMIUM_7_DAYS" | "PREMIUM_30_DAYS">("PREMIUM_30_DAYS");
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"NONE" | "PENDING">("NONE");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Check if there is already a pending payment request on load
    checkPendingPaymentAction().then(isPending => {
      if (isPending) setPaymentStatus("PENDING");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) return;

    setSubmitting(true);
    setErrorMsg("");
    
    try {
      await submitPaymentAction(utr, targetPlan);
      setPaymentStatus("PENDING");
      setShowModal(false);
      setUtr("");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while submitting payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)]">
        <h1 className="heading-md">Billing</h1>
        <p className="text-text-muted">Manage your plan, limits, and payments.</p>
      </section>

      {/* Payment Status Banner */}
      {paymentStatus === "PENDING" && (
        <div className="w-full p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-accent shrink-0 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-accent">Payment Submitted — Pending Verification</h3>
            <p className="text-xs text-text-muted">Your payment is currently being reviewed by an administrator. This typically takes a few hours. You will be upgraded to Premium automatically upon approval.</p>
          </div>
        </div>
      )}

      {/* Plan Card */}
      <div className="p-8 rounded-2xl glass border-[var(--border)] relative overflow-hidden group max-w-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <h2 className="text-text-muted text-sm font-medium tracking-wide uppercase flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Current Plan
            </h2>
            <div className="space-y-1">
              <h3 className="text-4xl font-bold tracking-tight">
                <span className={user.plan.includes("PREMIUM") ? "gradient-text-gold" : "text-text-primary"}>
                  {user.plan.replace(/_/g, " ")}
                </span>
              </h3>
              <p className="text-sm text-text-muted">
                {user.daily_limit.toLocaleString()} requests per day
              </p>
            </div>
          </div>

          {user.plan === "FREE" && paymentStatus === "NONE" && (
            <button 
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent/10 text-accent text-sm font-medium border border-accent/20 hover:bg-accent/20 transition-colors w-full md:w-auto"
            >
              Upgrade to Premium
            </button>
          )}

          {user.plan === "FREE" && paymentStatus === "PENDING" && (
            <div className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--surface)] text-text-muted text-sm font-medium border border-[var(--border)] w-full md:w-auto cursor-not-allowed">
              Upgrade Pending...
            </div>
          )}
        </div>
      </div>

      {/* Notice */}
      <div className="pt-8">
        <p className="text-xs text-text-muted flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          Plan limits and changes are securely enforced by the backend authority.
        </p>
      </div>

      {/* Manual Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
                    <Crown className="w-5 h-5 text-accent" />
                    Premium Upgrade
                  </h3>
                  <button 
                    onClick={() => !submitting && setShowModal(false)}
                    disabled={submitting}
                    className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Select Plan */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                      Select Duration
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setTargetPlan("PREMIUM_7_DAYS")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          targetPlan === "PREMIUM_7_DAYS" ? "bg-accent/10 border-accent/50 text-accent" : "bg-[var(--surface)] border-[var(--border)] text-text-primary hover:border-accent/30 hover:bg-[var(--surface)]/80"
                        }`}
                      >
                        <span className="font-bold">7 Days</span>
                        <span className="text-xs opacity-80 mt-1">$9.99</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTargetPlan("PREMIUM_30_DAYS")}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          targetPlan === "PREMIUM_30_DAYS" ? "bg-accent/10 border-accent/50 text-accent" : "bg-[var(--surface)] border-[var(--border)] text-text-primary hover:border-accent/30 hover:bg-[var(--surface)]/80"
                        }`}
                      >
                        <span className="font-bold">30 Days</span>
                        <span className="text-xs opacity-80 mt-1">$29.99</span>
                      </button>
                    </div>
                  </div>

                  <hr className="border-[var(--border)]" />

                  {/* Instructions */}
                  <div className="space-y-4">
                    <p className="text-sm text-text-muted">Follow these instructions to complete your manual upgrade:</p>
                    <ol className="text-sm text-text-muted space-y-2 list-decimal list-inside pl-2">
                      <li>Scan the QR code below.</li>
                      <li>Complete the exact payment amount for your chosen duration.</li>
                      <li>Copy the transaction UTR / Reference number.</li>
                      <li>Enter the UTR below and submit.</li>
                    </ol>
                  </div>

                  {/* QR Placeholder */}
                  <div className="w-full aspect-square max-w-[200px] mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-3">
                    <QrCode className="w-12 h-12 text-text-muted opacity-50" />
                    <span className="text-xs text-text-muted uppercase tracking-widest">Kairo QR Asset</span>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      {errorMsg}
                    </div>
                  )}

                  {/* UTR Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="utr" className="text-xs font-medium text-text-muted uppercase tracking-wider">
                        UTR / Reference Number
                      </label>
                      <input
                        id="utr"
                        type="text"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="Enter 12-digit UTR"
                        className="w-full px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm"
                        disabled={submitting}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!utr.trim() || submitting}
                      className="w-full h-11 flex items-center justify-center rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Submit Payment"
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
