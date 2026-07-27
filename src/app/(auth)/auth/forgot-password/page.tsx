"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type ForgotState = "email" | "otp" | "reset" | "success";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<ForgotState>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state !== "success") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Only @gmail.com addresses are supported right now.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      
      setLoading(false);
      setState("otp");
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error).message || "An error occurred.");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      
      setLoading(false);
      setState("reset");
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error).message || "An error occurred.");
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      
      setLoading(false);
      setState("success");
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error).message || "An error occurred.");
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 15, filter: "blur(5px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -15, filter: "blur(5px)" },
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
      <AnimatePresence mode="wait">
        
        {/* EMAIL STATE */}
        {state === "email" && (
          <motion.form
            key="email"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleEmailSubmit}
            className="w-full max-w-md flex flex-col items-center"
          >
            <label className="text-text-muted text-xs uppercase tracking-[0.2em] mb-8">
              Account Recovery
            </label>
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="Email address"
              className="w-full bg-transparent border-none outline-none text-center text-3xl font-light tracking-wide text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mt-4">
                {error}
              </motion.p>
            )}
            <div className="mt-12 flex flex-col items-center gap-6">
              <button
                type="submit"
                disabled={!email}
                className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
              <Link href="/auth/login" className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to Sign In
              </Link>
            </div>
          </motion.form>
        )}

        {/* OTP STATE */}
        {state === "otp" && (
          <motion.form
            key="otp"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleOtpSubmit}
            className="w-full max-w-md flex flex-col items-center"
          >
            <label className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">
              Verification
            </label>
            <p className="text-text-muted/60 text-sm mb-8 text-center max-w-[250px]">
              Enter the recovery code sent to <br/><span className="text-text-primary">{email}</span>
            </p>
            <input
              ref={inputRef}
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setOtp(val);
                setError(null);
              }}
              placeholder="------"
              className="w-full bg-transparent border-none outline-none text-center text-4xl font-mono tracking-[0.5em] text-text-primary placeholder:text-text-muted/20 focus:ring-0 p-0 ml-[0.5em]"
            />
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mt-4">
                {error}
              </motion.p>
            )}
            <div className="mt-12 flex flex-col items-center gap-6">
              <button
                type="submit"
                disabled={otp.length !== 6 || loading}
                className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </motion.form>
        )}

        {/* RESET STATE */}
        {state === "reset" && (
          <motion.form
            key="reset"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleResetSubmit}
            className="w-full max-w-md flex flex-col items-center"
          >
            <label className="text-text-muted text-xs uppercase tracking-[0.2em] mb-8">
              New Password
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter new password"
              className="w-full bg-transparent border-none outline-none text-center text-3xl font-light tracking-widest text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mt-4">
                {error}
              </motion.p>
            )}
            <div className="mt-12 flex flex-col items-center gap-6">
              <button
                type="submit"
                disabled={!password || loading}
                className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </motion.form>
        )}

        {/* SUCCESS STATE */}
        {state === "success" && (
          <motion.div
            key="success"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center border border-success/20 mb-6"
            >
              <CheckCircle2 className="w-8 h-8 text-success" />
            </motion.div>
            <h2 className="text-2xl font-light text-text-primary mb-2">Password Reset</h2>
            <p className="text-text-muted text-sm mb-8">Your intelligence access has been restored.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Return to login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
