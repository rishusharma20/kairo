"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ParticleField } from "@/components/effects/particle-field";
import { Loader2 } from "lucide-react";

export default function MaintenancePage() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) seconds--;
        else {
          seconds = 59;
          if (minutes > 0) minutes--;
          else {
            minutes = 59;
            if (hours > 0) hours--;
          }
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleField
          particleCount={20}
          color="255, 184, 0" // Warm amber/gold hue for maintenance state
          maxSize={1.5}
          speed={0.05}
          connectionDistance={120}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-amber-500/[0.02] blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center p-6">
        
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center max-w-lg text-center"
        >
          {/* Animated Loader */}
          <div className="relative w-24 h-24 mb-12 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-amber-500/20 border-t-amber-500/80"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-amber-500/10 border-b-amber-500/50"
            />
            <Loader2 className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>

          <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-text-primary mb-4">
            System Upgrading
          </h1>
          <p className="text-text-muted text-sm mb-12">
            The KAIRO intelligence layer is currently undergoing scheduled enhancements. Please stand by.
          </p>

          {/* Minimal Countdown */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-light text-text-primary font-mono tracking-widest">
                {timeLeft.hours.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-2">Hours</span>
            </div>
            <span className="text-2xl text-text-muted/30 -mt-6">:</span>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-light text-text-primary font-mono tracking-widest">
                {timeLeft.minutes.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-2">Minutes</span>
            </div>
            <span className="text-2xl text-text-muted/30 -mt-6">:</span>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-light text-text-primary font-mono tracking-widest">
                {timeLeft.seconds.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-2">Seconds</span>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
