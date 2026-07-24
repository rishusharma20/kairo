"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function ProfilePage() {
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
        <div className="w-24 h-24 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-8">
          <span className="text-4xl font-extralight text-accent">R</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          Rishu.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          rishu@gmail.com
        </p>
      </motion.section>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex justify-center text-text-muted/30 mb-24">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Information Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Tier */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Current Tier</h2>
          <span className="text-4xl md:text-6xl font-light text-text-primary group-hover:text-accent transition-colors duration-500">
            KAIRO PRO
          </span>
          <span className="text-[10px] text-success uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Active until 2027</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Devices */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Active Devices</h2>
          <span className="text-4xl md:text-6xl font-light text-text-primary group-hover:text-accent transition-colors duration-500">
            MacBook Pro 16"
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Current Session</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Security */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Security</h2>
          <span className="text-4xl md:text-6xl font-light text-text-primary group-hover:text-accent transition-colors duration-500">
            Protected.
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Last login: Just now</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Action */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <span className="text-2xl md:text-3xl font-light text-destructive/70 group-hover:text-destructive transition-colors duration-500">
            Sign Out.
          </span>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
