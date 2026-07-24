"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function AdminHomePage() {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.div 
      variants={stagger}
      initial="initial"
      animate="animate"
      className="w-full flex flex-col items-center justify-center text-center space-y-24 py-12"
    >
      {/* Cinematic Header */}
      <motion.section variants={fadeUp} className="flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          Root Access.
        </h1>
        <h2 className="text-4xl md:text-5xl font-light text-destructive mb-8">
          GRANTED.
        </h2>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", pulse ? "bg-destructive" : "bg-destructive/30")} />
          <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
            Monitoring KAIRO Network.
          </p>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="flex justify-center text-text-muted/30">
        <ArrowDown className="w-4 h-4 animate-bounce" />
      </motion.div>

      {/* Control Center Flow */}
      <motion.section variants={fadeUp} className="flex flex-col items-center space-y-24 w-full">
        
        {/* System Health */}
        <div className="flex flex-col items-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Core System Health</h2>
          <span className="text-6xl md:text-8xl font-light text-text-primary tracking-tighter group-hover:text-destructive transition-colors duration-700">100%</span>
          <span className="text-text-muted text-xs uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">All Services Operational</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Live Traffic */}
        <div className="flex flex-col items-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Active Sockets</h2>
          <span className="text-5xl md:text-7xl font-light text-text-primary tracking-tighter group-hover:text-destructive transition-colors duration-700">2,491</span>
          <span className="text-text-muted text-xs uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Users Connected</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Requests Processing */}
        <div className="flex flex-col items-center group cursor-default">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Throughput</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl md:text-7xl font-light text-text-primary tracking-tighter group-hover:text-destructive transition-colors duration-700">482</span>
            <span className="text-xl text-text-muted font-light">req/sec</span>
          </div>
          <span className="text-[10px] text-destructive uppercase tracking-[0.2em] mt-8 opacity-0 group-hover:opacity-100 transition-opacity">API Throttling: Nominal</span>
        </div>

      </motion.section>

      <motion.div variants={fadeUp} className="flex justify-center text-text-muted/30">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Recent Alerts Flow */}
      <motion.section variants={fadeUp} className="w-full flex flex-col items-center">
        <span className="text-text-muted text-xs uppercase tracking-[0.2em] mb-12">Network Activity Log</span>
        
        <div className="flex flex-col items-center space-y-12 w-full max-w-lg">
          <div className="group cursor-default text-center">
            <h3 className="text-xl font-light text-text-primary group-hover:text-destructive transition-colors">Server Cluster Alpha deployed.</h3>
            <span className="text-[10px] text-text-muted uppercase tracking-widest mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">Just Now - System</span>
          </div>

          <div className="flex justify-center text-text-muted/20">
            <ArrowDown className="w-3 h-3" />
          </div>

          <div className="group cursor-default text-center">
            <h3 className="text-xl font-light text-text-primary group-hover:text-destructive transition-colors">Spike in latency detected.</h3>
            <span className="text-[10px] text-text-muted uppercase tracking-widest mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">2 mins ago - Network</span>
          </div>

          <div className="flex justify-center text-text-muted/20">
            <ArrowDown className="w-3 h-3" />
          </div>

          <div className="group cursor-default text-center">
            <h3 className="text-xl font-light text-text-primary group-hover:text-destructive transition-colors">150 Pro Subscriptions Renewed.</h3>
            <span className="text-[10px] text-text-muted uppercase tracking-widest mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">1 hour ago - Billing</span>
          </div>
        </div>
      </motion.section>

      {/* Bottom Padding */}
      <div className="h-32" />
    </motion.div>
  );
}
