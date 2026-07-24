"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ParticleField } from "@/components/effects/particle-field";

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section ref={ref} className="relative py-40 px-6 overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 z-0">
        <ParticleField
          particleCount={40}
          color="0, 212, 255"
          maxSize={1}
          speed={0.15}
          connectionDistance={80}
        />
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[150px]" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="heading-lg text-text-primary mb-4 text-glow">
            Intelligence is waiting.
          </h2>
          <p className="text-text-muted text-body mb-10 max-w-md mx-auto">
            One shortcut away from thinking smarter. KAIRO never leaves your side.
          </p>

          <Link
            href="/auth/register"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent/10 text-accent text-base font-medium border border-accent/20 hover:bg-accent/15 hover:border-accent/30 hover:scale-[1.02] transition-all duration-300 glow-accent"
          >
            <span>Start Thinking</span>
            <kbd className="text-xs px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 font-mono">
              ⌥X
            </kbd>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
