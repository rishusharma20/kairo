"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminVerificationModal() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError("Invalid verification code.");
        }
        setCode("");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-sm font-bold text-text-primary tracking-widest uppercase">Kairo Admin</h2>
          <h3 className="text-xl font-semibold text-text-primary">Admin Verification</h3>
          <p className="text-sm text-text-muted">
            Additional verification is required to access the administration console.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full bg-black/50 border border-[var(--border)] rounded-xl p-4 text-center text-3xl font-mono text-text-primary tracking-[1em] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-destructive text-sm font-medium text-center bg-destructive/10 border border-destructive/20 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-accent text-accent-foreground font-semibold py-3 px-4 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center h-12"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            ) : (
              "Verify Access"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
