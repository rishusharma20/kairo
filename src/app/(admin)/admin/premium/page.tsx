"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function AdminPremiumPage() {
  const [editingPlan, setEditingPlan] = useState<"PRO" | "FREE" | null>(null);

  const fadeUp = {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      
      {/* Header */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="flex flex-col items-center mb-24 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          Revenue & Tiers.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Subscription Management.
        </p>
      </motion.section>

      {/* Global MRR */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24 mb-24"
      >
        <div className="flex flex-col items-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Current MRR</h2>
          <span className="text-6xl md:text-8xl font-light text-text-primary tracking-tighter group-hover:text-accent transition-colors duration-700">
            $42.4K
          </span>
          <span className="text-[10px] text-success uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            +12.4% from last month
          </span>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex justify-center text-text-muted/30 mb-24">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Plans Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* PRO PLAN */}
        <div 
          className="w-full flex flex-col items-center text-center group cursor-pointer"
          onClick={() => setEditingPlan(editingPlan === "PRO" ? null : "PRO")}
        >
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Tier 2</h2>
          <span className={cn(
            "text-5xl md:text-7xl font-light transition-colors duration-500",
            editingPlan === "PRO" ? "text-accent" : "text-text-primary group-hover:text-accent"
          )}>
            KAIRO PRO.
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4">1,248 Active Subscribers</span>

          <motion.div
            initial={false}
            animate={{ height: editingPlan === "PRO" ? "auto" : 0, opacity: editingPlan === "PRO" ? 1 : 0 }}
            className="overflow-hidden w-full"
          >
            <div className="pt-12 pb-4 flex flex-col items-center space-y-12">
              <div className="flex flex-col items-center">
                <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Price</span>
                <span className="text-4xl font-light text-text-primary">$20 / mo</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Limits</span>
                <span className="text-4xl font-light text-text-primary">Unlimited</span>
              </div>
              <div className="flex flex-col items-center group/action">
                <span className="text-2xl font-light text-text-muted group-hover/action:text-text-primary transition-colors cursor-pointer">
                  Modify Tier.
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* FREE PLAN */}
        <div 
          className="w-full flex flex-col items-center text-center group cursor-pointer"
          onClick={() => setEditingPlan(editingPlan === "FREE" ? null : "FREE")}
        >
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Tier 1</h2>
          <span className={cn(
            "text-5xl md:text-7xl font-light transition-colors duration-500",
            editingPlan === "FREE" ? "text-text-primary" : "text-text-muted group-hover:text-text-primary"
          )}>
            FREE BASE.
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4">12,482 Active Accounts</span>

          <motion.div
            initial={false}
            animate={{ height: editingPlan === "FREE" ? "auto" : 0, opacity: editingPlan === "FREE" ? 1 : 0 }}
            className="overflow-hidden w-full"
          >
            <div className="pt-12 pb-4 flex flex-col items-center space-y-12">
              <div className="flex flex-col items-center">
                <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Price</span>
                <span className="text-4xl font-light text-text-primary">$0 / mo</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Limits</span>
                <span className="text-4xl font-light text-text-primary">150 req / mo</span>
              </div>
              <div className="flex flex-col items-center group/action">
                <span className="text-2xl font-light text-text-muted group-hover/action:text-text-primary transition-colors cursor-pointer">
                  Modify Tier.
                </span>
              </div>
            </div>
          </motion.div>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
