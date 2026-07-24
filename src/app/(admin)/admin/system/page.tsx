"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AdminSystemPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [apiGateway, setApiGateway] = useState(true);
  const [registration, setRegistration] = useState(true);

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
          Global State.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Ecosystem Control.
        </p>
      </motion.section>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex justify-center text-text-muted/30 mb-24">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Toggles Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Maintenance Toggle */}
        <div 
          className="w-full flex flex-col items-center text-center cursor-pointer group" 
          onClick={() => setMaintenance(!maintenance)}
        >
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Maintenance Mode</h2>
          <span className={cn(
            "text-5xl md:text-7xl font-light transition-colors duration-500",
            maintenance ? "text-destructive" : "text-text-primary group-hover:text-text-muted"
          )}>
            {maintenance ? "ACTIVE." : "OFFLINE."}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to bypass standard routing
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* API Gateway Toggle */}
        <div 
          className="w-full flex flex-col items-center text-center cursor-pointer group" 
          onClick={() => setApiGateway(!apiGateway)}
        >
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">API Gateway</h2>
          <span className={cn(
            "text-5xl md:text-7xl font-light transition-colors duration-500",
            apiGateway ? "text-success" : "text-destructive"
          )}>
            {apiGateway ? "ROUTING." : "HALTED."}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to drop connections
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* User Registration Toggle */}
        <div 
          className="w-full flex flex-col items-center text-center cursor-pointer group" 
          onClick={() => setRegistration(!registration)}
        >
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">User Registration</h2>
          <span className={cn(
            "text-5xl md:text-7xl font-light transition-colors duration-500",
            registration ? "text-text-primary" : "text-destructive"
          )}>
            {registration ? "ACCEPTING." : "LOCKED."}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to throttle signups
          </span>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
