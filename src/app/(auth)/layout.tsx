"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ParticleField } from "@/components/effects/particle-field";
import { KairoBrand } from "@/components/layout/kairo-brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={30}
          color="0, 212, 255"
          maxSize={1}
          speed={0.1}
          connectionDistance={120}
        />
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.015] blur-[150px] mix-blend-screen" />
      </div>

      {/* Very subtle subtle gradient mask at edges */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-[var(--background)] pointer-events-none z-0" />

      {/* Main Content Area */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center p-6">
        
        {/* Minimal Logo Positioned High */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-12 md:top-16 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <Link href="/" className="group hover:opacity-80 transition-opacity">
            <KairoBrand variant="default" className="flex-col gap-3" />
          </Link>
        </motion.div>

        {/* Central Stage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="w-full max-w-lg mt-8"
        >
          {children}
        </motion.div>

      </div>
    </div>
  );
}
