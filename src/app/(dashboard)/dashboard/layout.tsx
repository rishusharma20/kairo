"use client";

import { KairoNav } from "@/components/layout/kairo-nav";
import { ParticleField } from "@/components/effects/particle-field";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--background)] relative overflow-hidden">
      {/* Universal Ambient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={20}
          color="0, 212, 255"
          maxSize={1}
          speed={0.1}
          connectionDistance={120}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-accent/[0.015] blur-[150px] mix-blend-screen" />
      </div>

      <KairoNav />

      <main className="flex-1 min-h-screen relative z-10 flex flex-col items-center justify-center pt-24 pb-12 px-6">
        <motion.div 
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const, delay: 0.2 }}
          className="w-full max-w-4xl flex flex-col items-center text-center"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
