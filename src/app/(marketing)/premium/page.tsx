"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowDown, ChevronRight } from "lucide-react";
import { ParticleField } from "@/components/effects/particle-field";
import { cn } from "@/lib/utils";

type ViewState = "home" | "plans" | "compare" | "upgrade" | "manage";

export default function PremiumEcosystemPage() {
  const [view, setView] = useState<ViewState>("home");
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO" | "ELITE" | null>(null);

  const fadeUp = {
    initial: { opacity: 0, y: 40, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, y: -40, filter: "blur(10px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center relative overflow-hidden pt-24 pb-12 px-6">
      
      {/* Dynamic Ambient Background based on state/plan */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={view === "upgrade" ? 80 : 30}
          color={
            selectedPlan === "ELITE" ? "255, 184, 0" : 
            selectedPlan === "PRO" ? "0, 212, 255" : 
            "255, 255, 255"
          }
          maxSize={view === "upgrade" ? 2 : 1}
          speed={view === "upgrade" ? 0.2 : 0.05}
          connectionDistance={120}
        />
        <div 
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[150px] mix-blend-screen transition-all duration-1000",
            selectedPlan === "ELITE" ? "bg-[#FFB800]/[0.02]" : 
            selectedPlan === "PRO" ? "bg-accent/[0.02]" : 
            "bg-white/[0.01]"
          )}
        />
      </div>

      <AnimatePresence mode="wait">
        
        {/* ======================= HOME STATE ======================= */}
        {view === "home" && (
          <motion.div key="home" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="z-10 flex flex-col items-center text-center max-w-4xl w-full">
            <h1 className="text-sm font-light text-text-muted uppercase tracking-[0.4em] mb-12">Premium Intelligence</h1>
            <h2 className="text-5xl md:text-8xl font-extralight text-text-primary mb-8 tracking-tighter leading-none">
              Unlock Your <br/> True Potential.
            </h2>
            <p className="text-xl md:text-2xl font-light text-text-muted mb-24 max-w-2xl">
              We are not selling requests. We are selling a cognitive leap.
            </p>
            
            <div className="flex flex-col md:flex-row items-center gap-12">
              <button 
                onClick={() => setView("plans")}
                className="group flex flex-col items-center gap-4 text-text-muted hover:text-text-primary transition-colors duration-500"
              >
                <span className="text-xs uppercase tracking-[0.3em]">Explore Tiers</span>
                <ArrowDown className="w-5 h-5 group-hover:translate-y-2 transition-transform duration-500" />
              </button>

              <button 
                onClick={() => setView("manage")}
                className="group flex flex-col items-center gap-4 text-text-muted hover:text-accent transition-colors duration-500"
              >
                <span className="text-xs uppercase tracking-[0.3em]">Current Subscription</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================= PLANS STATE ======================= */}
        {view === "plans" && (
          <motion.div key="plans" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="z-10 flex flex-col items-center text-center w-full max-w-4xl py-20">
            <button onClick={() => setView("home")} className="text-[10px] text-text-muted uppercase tracking-[0.3em] hover:text-text-primary mb-24 transition-colors">
              Back
            </button>

            <div className="flex flex-col items-center space-y-32 w-full">
              
              {/* FREE */}
              <div 
                className="group flex flex-col items-center cursor-pointer w-full"
                onClick={() => { setSelectedPlan("FREE"); setView("compare"); }}
              >
                <span className="text-[10px] text-text-muted uppercase tracking-[0.4em] mb-6">Tier 1</span>
                <h2 className="text-6xl md:text-[7rem] leading-none font-extralight text-text-primary group-hover:text-text-muted transition-colors duration-700 tracking-tighter">
                  FREE
                </h2>
                <span className="text-sm text-text-muted mt-8 group-hover:opacity-100 transition-opacity">Think Faster.</span>
              </div>

              <div className="w-px h-24 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />

              {/* PRO */}
              <div 
                className="group flex flex-col items-center cursor-pointer w-full"
                onClick={() => { setSelectedPlan("PRO"); setView("compare"); }}
              >
                <span className="text-[10px] text-accent uppercase tracking-[0.4em] mb-6">Tier 2</span>
                <h2 className="text-6xl md:text-[7rem] leading-none font-extralight text-text-primary group-hover:text-accent transition-colors duration-700 tracking-tighter">
                  PRO
                </h2>
                <span className="text-sm text-text-muted mt-8 group-hover:opacity-100 transition-opacity">Think Smarter.</span>
              </div>

              <div className="w-px h-24 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />

              {/* ELITE */}
              <div 
                className="group flex flex-col items-center cursor-pointer w-full"
                onClick={() => { setSelectedPlan("ELITE"); setView("compare"); }}
              >
                <span className="text-[10px] text-[#FFB800] uppercase tracking-[0.4em] mb-6">Tier 3</span>
                <h2 className="text-6xl md:text-[7rem] leading-none font-extralight text-text-primary group-hover:text-[#FFB800] transition-colors duration-700 tracking-tighter">
                  ELITE
                </h2>
                <span className="text-sm text-text-muted mt-8 group-hover:opacity-100 transition-opacity">Think Without Limits.</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================= COMPARE STATE ======================= */}
        {view === "compare" && selectedPlan && (
          <motion.div key="compare" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="z-10 flex flex-col items-center text-center w-full max-w-3xl">
            <button onClick={() => setView("plans")} className="text-[10px] text-text-muted uppercase tracking-[0.3em] hover:text-text-primary mb-12 transition-colors">
              Return to Tiers
            </button>
            
            <h2 className={cn(
              "text-5xl md:text-7xl font-extralight tracking-tighter mb-24 transition-colors duration-1000",
              selectedPlan === "ELITE" ? "text-[#FFB800]" : 
              selectedPlan === "PRO" ? "text-accent" : "text-text-primary"
            )}>
              {selectedPlan} FEATURES.
            </h2>

            <div className="flex flex-col w-full space-y-16">
              <div className="flex flex-col items-center border-b border-[var(--border)] pb-16">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Queries</span>
                <span className="text-4xl md:text-5xl font-light text-text-primary">
                  {selectedPlan === "FREE" ? "50 Daily" : selectedPlan === "PRO" ? "Unlimited Daily" : "Infinite Priority"}
                </span>
              </div>
              <div className="flex flex-col items-center border-b border-[var(--border)] pb-16">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Intelligence Models</span>
                <span className="text-4xl md:text-5xl font-light text-text-primary">
                  {selectedPlan === "FREE" ? "Standard GPT" : selectedPlan === "PRO" ? "GPT-4o + Claude" : "All Architectures"}
                </span>
              </div>
              <div className="flex flex-col items-center border-b border-[var(--border)] pb-16">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Response Latency</span>
                <span className="text-4xl md:text-5xl font-light text-text-primary">
                  {selectedPlan === "FREE" ? "Standard Queue" : selectedPlan === "PRO" ? "Priority Routing" : "Zero Wait"}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Pricing</span>
                <span className="text-4xl md:text-5xl font-light text-text-primary mb-12">
                  {selectedPlan === "FREE" ? "$0" : selectedPlan === "PRO" ? "$20 / mo" : "$99 / mo"}
                </span>
                
                {selectedPlan !== "FREE" && (
                  <button 
                    onClick={() => setView("upgrade")}
                    className={cn(
                      "group flex flex-col items-center gap-4 transition-colors duration-500",
                      selectedPlan === "PRO" ? "text-accent hover:text-white" : "text-[#FFB800] hover:text-white"
                    )}
                  >
                    <span className="text-sm uppercase tracking-[0.3em]">Initialize Unlock Sequence</span>
                    <ArrowDown className="w-5 h-5 group-hover:translate-y-2 transition-transform duration-500" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================= UPGRADE STATE ======================= */}
        {view === "upgrade" && (
          <motion.div key="upgrade" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="z-10 flex flex-col items-center text-center w-full max-w-2xl">
            <button onClick={() => setView("compare")} className="text-[10px] text-text-muted uppercase tracking-[0.3em] hover:text-text-primary mb-24 transition-colors">
              Abort Sequence
            </button>
            
            <div className="relative flex flex-col items-center justify-center h-64 w-full group cursor-pointer" onClick={() => setView("manage")}>
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-transparent to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-1000",
                selectedPlan === "PRO" ? "via-accent" : "via-[#FFB800]"
              )} />
              
              <h2 className="text-3xl md:text-5xl font-extralight text-text-primary tracking-widest mb-6">
                HOLD TO UNLOCK
              </h2>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-1 rounded-full transition-all duration-700",
                  selectedPlan === "PRO" ? "bg-accent/30 group-hover:bg-accent group-hover:w-24" : 
                  "bg-[#FFB800]/30 group-hover:bg-[#FFB800] group-hover:w-24"
                )} />
              </div>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.4em] mt-8 group-hover:text-text-primary transition-colors duration-500">
                Payment processed seamlessly via KAIRO ID.
              </span>
            </div>
          </motion.div>
        )}

        {/* ======================= MANAGE STATE (Current Subscription & Usage) ======================= */}
        {view === "manage" && (
          <motion.div key="manage" variants={fadeUp} initial="initial" animate="animate" exit="exit" className="z-10 flex flex-col items-center text-center w-full max-w-3xl">
            <button onClick={() => setView("home")} className="text-[10px] text-text-muted uppercase tracking-[0.3em] hover:text-text-primary mb-24 transition-colors">
              Return Home
            </button>
            
            <h1 className="text-xs text-text-muted uppercase tracking-[0.4em] mb-6">Current Intelligence Level</h1>
            <h2 className="text-6xl md:text-8xl font-extralight text-accent tracking-tighter mb-24">
              KAIRO PRO
            </h2>

            <div className="w-full flex flex-col items-center space-y-24">
              <div className="flex flex-col items-center group cursor-default">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Requests Used This Cycle</span>
                <span className="text-6xl font-light text-text-primary group-hover:text-accent transition-colors duration-700">2,492</span>
              </div>

              <div className="flex flex-col items-center group cursor-default">
                <span className="text-xs text-text-muted uppercase tracking-[0.3em] mb-6">Requests Remaining</span>
                <span className="text-6xl font-light text-text-primary group-hover:text-accent transition-colors duration-700">Infinite</span>
                <span className="text-[10px] text-text-muted uppercase tracking-[0.3em] mt-6 opacity-0 group-hover:opacity-100 transition-opacity">Unlimited PRO Benefit</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">Next Billing Cycle</span>
                <span className="text-lg font-light text-text-primary">Oct 14, 2026</span>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
