"use client";

import { motion } from "framer-motion";
import { ParticleField } from "@/components/effects/particle-field";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={20}
          color="0, 212, 255"
          maxSize={1}
          speed={0.1}
          connectionDistance={120}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.02] blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {/* Minimal KAIRO Loader */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="relative w-16 h-16 flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-accent/20 border-t-accent/80"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-accent/10 border-b-accent/50"
            />
            <span className="text-accent font-bold text-lg tracking-wider">K</span>
          </div>

          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-text-muted/70 text-xs uppercase tracking-[0.3em]"
          >
            Initializing
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
