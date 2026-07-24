"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function PremiumPage() {
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
          KAIRO PRO.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Unrestricted Intelligence.
        </p>
      </motion.section>

      {/* Information Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Tier */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Current Status</h2>
          <span className="text-4xl md:text-6xl font-light text-accent transition-colors duration-500">
            Active.
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Since July 2026</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Requests Remaining */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Requests Remaining</h2>
          <span className="text-7xl md:text-[8rem] leading-none font-extralight text-text-primary group-hover:text-accent transition-colors duration-700">
            Unlimited.
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-8 opacity-0 group-hover:opacity-100 transition-opacity">No limits imposed.</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Expiry */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Renewal</h2>
          <span className="text-3xl md:text-5xl font-light text-text-primary group-hover:text-accent transition-colors duration-500">
            July 24, 2027
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-6 opacity-0 group-hover:opacity-100 transition-opacity">Auto-renew enabled</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Action */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <span className="text-2xl md:text-3xl font-light text-text-muted group-hover:text-text-primary transition-colors duration-500">
            Manage Subscription.
          </span>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
