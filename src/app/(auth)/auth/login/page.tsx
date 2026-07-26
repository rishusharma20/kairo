"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

type AuthState =
  | "email"
  | "password"
  | "otp"
  | "loader"
  | "welcome";

const LOADER_STEPS = [
  { text: "Synchronizing Intelligence.....", percent: 15 },
  { text: "Loading Preferences.....", percent: 35 },
  { text: "Loading Premium Information.....", percent: 55 },
  { text: "Synchronizing Dashboard.....", percent: 75 },
  { text: "Fetching Statistics.....", percent: 90 },
  { text: "Welcome Back.", percent: 100 },
];

export default function LoginPage() {
  const [state, setState] = useState<AuthState>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [loaderStep, setLoaderStep] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inputs on state change
  useEffect(() => {
    if (state === "email" || state === "password" || state === "otp") {
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
    setState("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      setLoading(false);
      startLoaderSequence(); // Skip OTP, login is successful
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error).message || "Invalid credentials.");
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
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      
      setLoading(false);
      startLoaderSequence();
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error).message || "Invalid code.");
    }
  };

  const startLoaderSequence = () => {
    setState("loader");
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < LOADER_STEPS.length) {
        setLoaderStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => setState("welcome"), 800);
      }
    }, 1200); // 1.2s per loading step
  };

  const extractFirstName = (email: string) => {
    const namePart = email.split("@")[0];
    return namePart.toUpperCase();
  };

  // Animation variants
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
              Identification
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
                className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-30 disabled:hover:border-[var(--border)] disabled:hover:bg-transparent"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link href="/auth/register" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                Create an account
              </Link>
            </div>
          </motion.form>
        )}

        {/* PASSWORD STATE */}
        {state === "password" && (
          <motion.form
            key="password"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handlePasswordSubmit}
            className="w-full max-w-md flex flex-col items-center"
          >
            <div className="flex items-center gap-3 mb-8 cursor-pointer group" onClick={() => setState("email")}>
              <span className="text-text-muted text-xs uppercase tracking-[0.2em] group-hover:text-text-primary transition-colors">
                {email}
              </span>
            </div>
            
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password"
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
              <Link href="/auth/forgot-password" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                Forgot password?
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
              We sent a 6-digit code to <br/><span className="text-text-primary">{email}</span>
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
              
              <div className="flex items-center gap-4 text-xs">
                <button type="button" className="text-text-muted hover:text-text-primary transition-colors">
                  Resend Code
                </button>
                <span className="text-[var(--border)]">|</span>
                <button type="button" onClick={() => setState("email")} className="text-text-muted hover:text-text-primary transition-colors">
                  Change Email
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* LOADER STATE */}
        {state === "loader" && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center justify-center"
          >
            <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
              {/* Spinning minimal ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-accent/20 border-t-accent/80"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border border-accent/10 border-b-accent/50"
              />
              {/* Percentage */}
              <AnimatePresence mode="wait">
                <motion.span
                  key={LOADER_STEPS[loaderStep].percent}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-2xl font-light text-text-primary"
                >
                  {LOADER_STEPS[loaderStep].percent}%
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Loading Text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={LOADER_STEPS[loaderStep].text}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.5 }}
                className="text-text-muted tracking-widest text-sm uppercase"
              >
                {LOADER_STEPS[loaderStep].text}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* WELCOME STATE */}
        {state === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center justify-center text-center"
            onAnimationComplete={() => {
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 2500);
            }}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
                Welcome Back.
              </h1>
              <h2 className="text-4xl md:text-5xl font-light text-accent mb-8">
                {extractFirstName(email)}
              </h2>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="text-text-muted text-sm tracking-[0.2em] uppercase"
              >
                Intelligence Never Left.
              </motion.p>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
