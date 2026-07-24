"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ParticleField } from "@/components/effects/particle-field";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={20}
          color="255, 59, 92" // Slight red hue for error state
          maxSize={1}
          speed={0.1}
          connectionDistance={120}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-destructive/[0.02] blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="text-[12rem] leading-none font-extralight text-text-primary/10 tracking-tighter mb-4">
            404
          </div>
          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-text-primary mb-4">
            Sector Unknown
          </h1>
          <p className="text-text-muted text-sm max-w-sm mx-auto mb-12">
            Intelligence could not locate this sector in the KAIRO ecosystem.
          </p>
          
          <Link 
            href="/"
            className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Return to Core
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
