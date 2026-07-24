"use client";

import { motion } from "framer-motion";
import { ArrowDown, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const fadeUp = {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  const FAQS = [
    { q: "How do I upgrade my tier?", a: "You can manage your subscription directly from the Premium section." },
    { q: "What models are supported?", a: "We currently route dynamically between Gemini 2.0 Flash, Pro, and Ultra depending on the request complexity." },
    { q: "Is my data used for training?", a: "No. Your intelligence layer is completely sandboxed. We do not use telemetry or prompt data for model training." }
  ];

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
          Assistance.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          KAIRO Support Center.
        </p>
      </motion.section>

      {/* Support Flow */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center space-y-24"
      >
        
        {/* Contact Support */}
        <div className="w-full flex flex-col items-center text-center group cursor-pointer">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-8">Reach Out</h2>
          <div className="w-16 h-16 rounded-full border border-text-muted/20 flex items-center justify-center mb-8 group-hover:bg-accent/10 group-hover:border-accent/20 transition-all duration-500">
            <MessageSquare className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors duration-500" />
          </div>
          <span className="text-3xl md:text-5xl font-light text-text-primary group-hover:text-accent transition-colors duration-500">
            Open Ticket.
          </span>
          <span className="text-[10px] text-success uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Average response: 5 mins
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Active Tickets Empty State */}
        <div className="w-full flex flex-col items-center text-center">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-8">Active Tickets</h2>
          <span className="text-2xl font-light text-text-muted/50">
            No active queries.
          </span>
        </div>

        <div className="flex justify-center text-text-muted/30">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* FAQs */}
        <div className="w-full flex flex-col items-center text-center">
          <h2 className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-12">Common Inquiries</h2>
          
          <div className="flex flex-col w-full max-w-lg space-y-8">
            {FAQS.map((faq, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              >
                <span className={cn(
                  "text-xl md:text-2xl font-light transition-colors duration-300",
                  activeFaq === idx ? "text-accent" : "text-text-primary group-hover:text-accent/70"
                )}>
                  {faq.q}
                </span>
                
                <motion.div
                  initial={false}
                  animate={{ height: activeFaq === idx ? "auto" : 0, opacity: activeFaq === idx ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="pt-4 text-sm text-text-muted tracking-wide font-light max-w-sm text-center">
                    {faq.a}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

      </motion.section>

      <div className="h-32" />
    </div>
  );
}
