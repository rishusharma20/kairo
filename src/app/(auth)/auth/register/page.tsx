"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type AuthStep = "credentials" | "otp";

export default function RegisterPage() {
  const [step, setStep] = useState<AuthStep>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "",
  });
  const [otpCode, setOtpCode] = useState("");

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "#FF3B5C", "#FFB800", "#00D4FF", "#00FF94"];

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.email.toLowerCase().endsWith("@gmail.com")) {
      setError("We are currently only accepting @gmail.com addresses.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // Simulate API call to send OTP
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "An error occurred during registration.");
    }
  };

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
          <span className="text-accent font-bold text-sm">K</span>
        </div>
        <span className="text-text-primary font-medium tracking-[0.15em] text-sm">KAIRO</span>
      </div>

      <div className="mb-8">
        <h2 className="heading-md text-text-primary mb-2">Create your account</h2>
        <p className="text-text-muted text-sm">
          {step === "credentials" 
            ? "Join thousands thinking smarter with KAIRO." 
            : `We sent a verification code to ${formData.email}`}
        </p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === "credentials" ? (
          <motion.form 
            key="credentials"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleCredentialsSubmit} 
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setError(null);
                }}
                placeholder="John Doe"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setError(null);
                }}
                placeholder="you@gmail.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength */}
              {formData.password && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((level) => (
                      <motion.div
                        key={level}
                        className="h-1 flex-1 rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{
                          scaleX: passwordStrength >= level ? 1 : 0,
                          backgroundColor:
                            passwordStrength >= level
                              ? strengthColors[passwordStrength]
                              : "var(--border)",
                        }}
                        style={{ originX: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: strengthColors[passwordStrength] }}
                  >
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--card)] text-accent focus:ring-accent/20 accent-[var(--accent)]"
              />
              <span className="text-text-muted text-xs">
                I agree to the{" "}
                <a href="#" className="text-accent hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-accent hover:underline">Privacy Policy</a>
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleOtpSubmit}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-text-secondary text-sm">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  // Only allow numbers
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setOtpCode(val);
                  setError(null);
                }}
                placeholder="000000"
                required
                className="w-full px-4 py-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-text-primary text-2xl tracking-[1em] text-center font-mono placeholder:text-text-muted/30 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading || success || otpCode.length !== 6}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                success
                  ? "bg-success/15 text-success border border-success/20"
                  : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account Created!</span>
                </>
              ) : (
                <>
                  <span>Verify and Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setOtpCode("");
                setError(null);
              }}
              className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors mt-4"
            >
              Back to registration
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="text-center mt-8 text-text-muted text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
