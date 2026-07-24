"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function VerifyPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = useCallback(async () => {
    if (otp.some((d) => !d)) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
  }, [otp]);

  useEffect(() => {
    if (otp.every((d) => d)) {
      handleSubmit();
    }
  }, [otp, handleSubmit]);

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
          <span className="text-accent font-bold text-sm">K</span>
        </div>
        <span className="text-text-primary font-medium tracking-[0.15em] text-sm">KAIRO</span>
      </div>

      <div className="mb-8">
        <h2 className="heading-md text-text-primary mb-2">Verify your email</h2>
        <p className="text-text-muted text-sm">
          We sent a 6-digit code to <span className="text-text-secondary">you@example.com</span>
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <motion.input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 rounded-xl text-center text-lg font-mono border transition-all duration-300 focus:outline-none ${
              success
                ? "bg-success/10 border-success/30 text-success"
                : digit
                ? "bg-accent/5 border-accent/30 text-text-primary"
                : "bg-[var(--card)] border-[var(--border)] text-text-primary"
            } focus:border-accent/40 focus:ring-1 focus:ring-accent/20`}
            animate={success ? { scale: [1, 1.1, 1] } : {}}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>

      {/* Verify button */}
      <motion.button
        onClick={handleSubmit}
        disabled={loading || success || otp.some((d) => !d)}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
          success
            ? "bg-success/15 text-success border border-success/20"
            : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15"
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified!</span>
          </>
        ) : (
          <>
            <span>Verify</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>

      {/* Resend */}
      <div className="text-center mt-6">
        {resendTimer > 0 ? (
          <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
            <span>Resend code in</span>
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="var(--border)" strokeWidth="2" />
                <circle
                  cx="16" cy="16" r="14" fill="none" stroke="var(--accent)"
                  strokeWidth="2" strokeLinecap="round"
                  strokeDasharray={`${(resendTimer / 30) * 88} 88`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-accent font-mono">
                {resendTimer}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setResendTimer(30)}
            className="text-accent text-sm hover:underline"
          >
            Resend code
          </button>
        )}
      </div>

      <p className="text-center mt-8 text-text-muted text-sm">
        <Link href="/auth/login" className="text-accent hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
