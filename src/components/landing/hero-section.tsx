"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ParticleField } from "@/components/effects/particle-field";
import { TextReveal, CharReveal } from "@/components/effects/text-reveal";
import { MouseSpotlight } from "@/components/effects/mouse-spotlight";

export function HeroSection() {
  const [showShortcut, setShowShortcut] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
    const timer = setTimeout(() => setShowShortcut(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient particle field */}
      <div className="absolute inset-0 z-0">
        <ParticleField
          particleCount={80}
          color="0, 212, 255"
          maxSize={1.5}
          speed={0.2}
          connectionDistance={100}
        />
      </div>

      {/* Radial gradient backdrop */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />
      </div>

      <MouseSpotlight />

      {/* Content */}
      <div className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto flex flex-col items-center mt-12 mb-24">
        {/* Subtle badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-text-muted text-xs font-mono">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-success"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            The invisible intelligence layer
          </span>
        </motion.div>

        <div className="mb-6 w-full flex flex-col items-center justify-center">
          <div className="text-[clamp(1.5rem,5.5vw,5rem)] leading-[1.1] font-light text-text-secondary mb-2 whitespace-nowrap">
            <TextReveal text="What if intelligence" delay={0.4} stagger={0.06} />
          </div>
          <div className="text-[clamp(1.5rem,5.5vw,5rem)] leading-[1.1] font-light text-text-primary whitespace-nowrap">
            <TextReveal text="never needed another tab?" delay={0.8} stagger={0.06} />
          </div>
        </div>

        {/* KAIRO wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-3"
        >
          <h1 className="text-7xl md:text-9xl lg:text-[10rem] font-extralight tracking-[0.3em] text-text-primary text-glow-strong ml-[0.3em]">
            <CharReveal text="KAIRO" stagger={0.08} delay={1.5} />
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="text-text-muted text-sm md:text-base tracking-[0.2em] uppercase font-light mb-16"
        >
          Your Invisible Intelligence
        </motion.p>

        {/* Keyboard shortcut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showShortcut ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-3">
            <kbd className="px-5 py-3 rounded-2xl glass-strong text-text-primary font-mono text-xl tracking-widest border border-[var(--border)] hover:border-accent/40 transition-colors cursor-default shadow-lg">
              {isMac ? "⌥" : "Alt"} + D
            </kbd>
          </div>
          <span className="text-text-muted text-sm tracking-widest uppercase font-light mt-2">to invoke intelligence</span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-text-muted text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-text-muted/60 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}
