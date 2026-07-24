"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [notifications, setNotifications] = useState(true);
  const [telemetry, setTelemetry] = useState(false);

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
          Configuration.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          System Preferences.
        </p>
      </motion.section>

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex justify-center text-text-muted/30 mb-24">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Settings Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Theme Settings */}
        <div className="w-full flex flex-col items-center text-center">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-12">Interface Theme</h2>
          <div className="flex items-center gap-12">
            <button 
              onClick={() => setTheme("dark")}
              className={cn(
                "text-2xl font-light transition-colors duration-300", 
                theme === "dark" ? "text-accent" : "text-text-muted hover:text-text-primary"
              )}
            >
              Dark.
            </button>
            <button 
              onClick={() => setTheme("light")}
              className={cn(
                "text-2xl font-light transition-colors duration-300", 
                theme === "light" ? "text-accent" : "text-text-muted hover:text-text-primary"
              )}
            >
              Light.
            </button>
            <button 
              onClick={() => setTheme("system")}
              className={cn(
                "text-2xl font-light transition-colors duration-300", 
                theme === "system" ? "text-accent" : "text-text-muted hover:text-text-primary"
              )}
            >
              System.
            </button>
          </div>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Notifications */}
        <div className="w-full flex flex-col items-center text-center cursor-pointer group" onClick={() => setNotifications(!notifications)}>
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Notifications</h2>
          <span className={cn(
            "text-4xl md:text-5xl font-light transition-colors duration-500",
            notifications ? "text-text-primary" : "text-text-muted"
          )}>
            {notifications ? "Enabled." : "Disabled."}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to toggle
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Telemetry */}
        <div className="w-full flex flex-col items-center text-center cursor-pointer group" onClick={() => setTelemetry(!telemetry)}>
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-4">Telemetry</h2>
          <span className={cn(
            "text-4xl md:text-5xl font-light transition-colors duration-500",
            telemetry ? "text-text-primary" : "text-text-muted"
          )}>
            {telemetry ? "Sending." : "Private."}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to toggle
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Account Data */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <span className="text-2xl md:text-3xl font-light text-text-muted group-hover:text-text-primary transition-colors duration-500">
            Export Data.
          </span>
        </div>
        
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <span className="text-2xl md:text-3xl font-light text-destructive/50 group-hover:text-destructive transition-colors duration-500">
            Delete Account.
          </span>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
