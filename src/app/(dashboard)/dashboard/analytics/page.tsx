"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function AnalyticsPage() {
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
          Usage Analytics.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Quantified Intelligence.
        </p>
      </motion.section>

      {/* Massive Typography Stats */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Daily Volume</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-7xl md:text-[8rem] leading-none font-extralight text-text-primary tracking-tighter group-hover:text-accent transition-colors duration-700">142</span>
            <span className="text-xl text-text-muted font-light">req</span>
          </div>
          
          {/* Minimal Sparkline (Linear/Apple Health style) */}
          <div className="w-full max-w-md h-24 mt-8 relative opacity-30 group-hover:opacity-100 transition-opacity duration-700">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              {/* Grid / Axis completely removed, just pure smooth data line */}
              <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path 
                d="M 0,24 L 0,15 C 10,15 15,22 25,20 C 35,18 40,8 50,10 C 60,12 65,18 75,16 C 85,14 90,4 100,5 L 100,24 Z" 
                fill="url(#gradient)"
              />
              <path 
                d="M 0,15 C 10,15 15,22 25,20 C 35,18 40,8 50,10 C 60,12 65,18 75,16 C 85,14 90,4 100,5" 
                fill="none" 
                stroke="var(--accent)" 
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke" 
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Response Latency</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-7xl md:text-[8rem] leading-none font-extralight text-text-primary tracking-tighter group-hover:text-success transition-colors duration-700">12</span>
            <span className="text-xl text-text-muted font-light">ms</span>
          </div>
          <span className="text-[10px] text-success uppercase tracking-[0.2em] mt-8 opacity-0 group-hover:opacity-100 transition-opacity">Optimal Network State</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        <div className="w-full flex flex-col items-center text-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Core Model</h2>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-5xl md:text-7xl leading-none font-extralight text-text-primary tracking-tighter group-hover:text-accent transition-colors duration-700">Gemini 2.0 Flash</span>
          </div>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-8 opacity-0 group-hover:opacity-100 transition-opacity">94% Request Share</span>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
