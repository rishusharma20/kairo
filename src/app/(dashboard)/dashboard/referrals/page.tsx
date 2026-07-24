"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { Gift, Copy, Check, Users, DollarSign, Share2, Share, Mail as MailIcon, LinkIcon } from "lucide-react";

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText("KAIRO-ALEX2024");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="heading-md text-text-primary">Referrals</h1>
        <p className="text-text-muted text-sm mt-1">Invite friends and earn premium credits.</p>
      </motion.div>

      {/* Referral Code */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SpotlightCard className="p-6" spotlightColor="rgba(0, 212, 255, 0.06)">
          <div className="flex items-center gap-3 mb-5">
            <Gift className="w-5 h-5 text-accent" />
            <h3 className="text-text-primary text-sm font-medium">Your Referral Code</h3>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 rounded-xl bg-[#0a0a0a] border border-accent/15 text-accent text-lg font-mono text-center tracking-[0.3em]">
              KAIRO-ALEX2024
            </code>
            <button
              onClick={copyCode}
              className="px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 transition-all"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2 mt-4">
            {[
              { icon: Share, label: "Twitter" },
              { icon: MailIcon, label: "Email" },
              { icon: LinkIcon, label: "Copy Link" },
            ].map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-text-muted text-xs hover:text-text-primary hover:bg-[var(--card-hover)] transition-all"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Friends Invited", value: "12", icon: Users, color: "#00D4FF" },
          { label: "Friends Joined", value: "8", icon: Share2, color: "#10B981" },
          { label: "Credits Earned", value: "$24", icon: DollarSign, color: "#FFB800" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
            <SpotlightCard className="p-5">
              <stat.icon className="w-4 h-4 mb-3" style={{ color: stat.color }} />
              <p className="text-2xl font-light text-text-primary">{stat.value}</p>
              <p className="text-text-muted text-xs mt-1">{stat.label}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <SpotlightCard className="p-6">
          <h3 className="text-text-primary text-sm font-medium mb-5">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Share", desc: "Share your unique referral code with friends." },
              { step: "02", title: "Join", desc: "Your friend signs up using your code." },
              { step: "03", title: "Earn", desc: "Both of you get $3 in premium credits." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="text-accent text-2xl font-light font-mono">{item.step}</span>
                <h4 className="text-text-primary text-sm font-medium mt-2 mb-1">{item.title}</h4>
                <p className="text-text-muted text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
