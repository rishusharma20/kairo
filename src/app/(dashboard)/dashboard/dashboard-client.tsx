"use client";

import { motion } from "framer-motion";
import { ArrowDown, Command } from "lucide-react";
import { useState, useEffect } from "react";

export function DashboardClient({ 
  name, 
  requestsToday, 
  planId, 
  avgLatency,
  recentRequests
}: { 
  name: string; 
  requestsToday: number; 
  planId: string; 
  avgLatency: number;
  recentRequests: { type: string, latency: number, time: string }[];
}) {
  const [greeting, setGreeting] = useState("Good Evening.");
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning.");
    else if (hour < 18) setGreeting("Good Afternoon.");
    else setGreeting("Good Evening.");
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
      {/* Greeting Section */}
      <motion.section variants={fadeUp} className="flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          {greeting}
        </h1>
        <h2 className="text-4xl md:text-5xl font-light text-accent mb-8">
          {name}.
        </h2>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Intelligence Never Left.
        </p>
      </motion.section>

      {/* Down Arrow Separator */}
      <motion.div variants={fadeUp} className="flex justify-center text-text-muted/30">
        <ArrowDown className="w-4 h-4 animate-bounce" />
      </motion.div>

      {/* Quick Stats Flow */}
      <motion.section variants={fadeUp} className="flex flex-col items-center space-y-24">
        <div className="flex flex-col items-center">
          <span className="text-5xl md:text-6xl font-light text-text-primary tracking-tight">{requestsToday}</span>
          <span className="text-text-muted text-xs uppercase tracking-[0.2em] mt-4">Requests Today.</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        <div className="flex flex-col items-center group">
          <span className="text-3xl md:text-4xl font-light text-accent tracking-widest uppercase">{planId} PLAN</span>
          <span className="text-text-muted text-xs uppercase tracking-[0.2em] mt-4">Active.</span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        <div className="flex flex-col items-center">
          <span className="text-5xl md:text-6xl font-light text-text-primary tracking-tight">{avgLatency}ms</span>
          <span className="text-text-muted text-xs uppercase tracking-[0.2em] mt-4">Avg Response Time.</span>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="flex justify-center text-text-muted/30">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Continue Thinking (Command Input) */}
      <motion.section variants={fadeUp} className="w-full max-w-2xl flex flex-col items-center">
        <span className="text-text-muted text-xs uppercase tracking-[0.2em] mb-8">Continue Thinking.</span>
        
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-accent/5 blur-xl group-hover:bg-accent/10 transition-colors duration-500 rounded-full" />
          <div className="relative flex items-center bg-transparent border-b border-[var(--border)] group-hover:border-accent/30 transition-colors pb-4 px-2">
            <Command className="w-5 h-5 text-text-muted group-focus-within:text-accent transition-colors mr-4" />
            <input 
              type="text" 
              placeholder="Ask KAIRO anything..."
              className="w-full bg-transparent border-none outline-none text-2xl font-light text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
          </div>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="flex justify-center text-text-muted/30">
        <ArrowDown className="w-4 h-4" />
      </motion.div>

      {/* Recent Requests Flow */}
      <motion.section variants={fadeUp} className="w-full flex flex-col items-center">
        <span className="text-text-muted text-xs uppercase tracking-[0.2em] mb-12">Recent Requests</span>
        
        <div className="flex flex-col items-center space-y-12 w-full max-w-lg">
          {recentRequests.length === 0 ? (
            <div className="text-text-muted/50 text-sm">No recent requests yet.</div>
          ) : (
            recentRequests.map((req, i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className="group cursor-pointer text-center">
                  <h3 className="text-xl font-light text-text-primary group-hover:text-accent transition-colors">
                    {req.type === 'page' ? 'Page Analysis' : req.type === 'text' ? 'Text Analysis' : 'Ask Anything'}
                  </h3>
                  <span className="text-[10px] text-text-muted uppercase tracking-widest mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">
                    {req.latency}ms • {req.time}
                  </span>
                </div>
                {i < recentRequests.length - 1 && (
                  <div className="flex justify-center text-text-muted/20 my-12">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.section>

      {/* Bottom Padding */}
      <div className="h-32" />
    </motion.div>
  );
}
