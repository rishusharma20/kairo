import React from "react";

export const metadata = {
  title: "Privacy Policy | Kairo AI",
  description: "Privacy Policy and Limitation of Liability for Kairo AI Assistant Extension",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 bg-slate-900/60 p-8 sm:p-12 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-2xl">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Privacy Policy & Terms
          </h1>
          <p className="text-sm text-slate-400">
            Effective Date: July 28, 2026 | Last Updated: July 28, 2026
          </p>
        </div>

        <section className="space-y-4 text-slate-300 leading-relaxed text-sm sm:text-base">
          <p>
            Welcome to <strong>Kairo</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). Kairo is an AI assistant browser extension and platform (&quot;Extension&quot;, &quot;Service&quot;).
          </p>
          <p>
            Please read this Privacy Policy and Disclaimer carefully. By installing or using the Kairo extension or service, you agree to the collection and use of information in accordance with this policy and accept the complete limitation of liability.
          </p>
        </section>

        <hr className="border-slate-800" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Information Collection and Use</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm sm:text-base">
            <li>
              <strong>Account Data:</strong> When logging in, we authenticate credentials to identify your account and manage query quotas.
            </li>
            <li>
              <strong>Page Context:</strong> Page text or user selection extracted when invoking Kairo is processed securely via our servers (<code className="text-emerald-400">https://aikairo.vercel.app</code>) solely to generate AI responses.
            </li>
            <li>
              <strong>No Third-Party Sharing:</strong> We do not sell, rent, or trade your data to third-party data brokers or advertisers.
            </li>
          </ul>
        </section>

        <hr className="border-slate-800" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Disclaimer of Warranties & Limitation of Liability</h2>
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 space-y-3 text-red-200 text-sm">
            <p className="font-bold tracking-wide uppercase">AS-IS & NO LIABILITY DISCLAIMER</p>
            <p>
              THE EXTENSION AND SERVICE ARE PROVIDED STRICTLY ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND.
            </p>
            <p>
              WE EXPRESSLY DISCLAIM ALL RESPONSIBILITY FOR THE ACCURACY, RELIABILITY, OR ADEQUACY OF ANY AI-GENERATED OUTPUTS. UNDER NO CIRCUMSTANCES SHALL KAIRO OR ITS CREATORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL LOSSES, DATA LOSS, OR SYSTEM ERRORS ARISING FROM THE USE OF THE EXTENSION. YOU ASSUME FULL RESPONSIBILITY FOR ALL ACTIONS TAKEN BASED ON AI OUTPUTS.
            </p>
          </div>
        </section>

        <hr className="border-slate-800" />

        <section className="space-y-4 text-slate-300 text-sm sm:text-base">
          <h2 className="text-xl font-semibold text-white">3. Data Transmission</h2>
          <p>
            All data transmitted between the extension and our API servers is encrypted using standard HTTPS/TLS protocols.
          </p>
        </section>

        <hr className="border-slate-800" />

        <section className="space-y-2 text-slate-400 text-sm">
          <h2 className="text-lg font-semibold text-white">4. Contact Information</h2>
          <p>Email: support@kairo.ai</p>
          <p>Website: https://aikairo.vercel.app</p>
        </section>
      </div>
    </div>
  );
}
