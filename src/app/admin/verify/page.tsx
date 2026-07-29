"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminVerifyPage() {
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

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many failed attempts. Please try again later.");
        } else {
          setError("Invalid admin access code.");
        }
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Verification</h1>
          <p className="text-zinc-400">Enter your 6-digit admin access code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-black border border-zinc-800 rounded-lg p-4 text-center text-3xl font-mono text-white tracking-[1em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center h-12"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              "Verify"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
