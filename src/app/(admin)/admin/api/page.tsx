"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function AdminApiPage() {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

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
          API & Analytics.
        </h1>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", pulse ? "bg-success" : "bg-success/30")} />
          <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
            Cluster Operating Normally.
          </p>
        </div>
      </motion.section>

      {/* Stats Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Global Volume */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Total Volume (24h)</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-7xl md:text-[8rem] leading-none font-extralight text-text-primary tracking-tighter group-hover:text-destructive transition-colors duration-700">1.2M</span>
            <span className="text-xl text-text-muted font-light">req</span>
          </div>
          
          {/* Minimal Sparkline (Linear/Apple Health style) */}
          <div className="w-full max-w-md h-24 mt-8 relative opacity-30 group-hover:opacity-100 transition-opacity duration-700">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gradientApi" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path 
                d="M 0,24 L 0,15 C 20,10 30,22 50,18 C 70,14 80,5 100,8 L 100,24 Z" 
                fill="url(#gradientApi)"
              />
              <path 
                d="M 0,15 C 20,10 30,22 50,18 C 70,14 80,5 100,8" 
                fill="none" 
                stroke="var(--destructive)" 
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke" 
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Latency */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Global Latency</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-7xl md:text-[8rem] leading-none font-extralight text-text-primary tracking-tighter group-hover:text-destructive transition-colors duration-700">24</span>
            <span className="text-xl text-text-muted font-light">ms</span>
          </div>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-8 opacity-0 group-hover:opacity-100 transition-opacity">Optimal Routing Active</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Error Rate */}
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Error Rate</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-5xl md:text-7xl leading-none font-extralight text-text-primary tracking-tighter group-hover:text-success transition-colors duration-700">0.01</span>
            <span className="text-xl text-text-muted font-light">%</span>
          </div>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
