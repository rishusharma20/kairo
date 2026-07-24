"use client";

import { motion } from "framer-motion";
import { Search, Command, ArrowDown, Activity } from "lucide-react";
import { useState } from "react";

const HISTORY_DATA = [
  { id: 1, query: "Explain Merge Sort", context: "Algorithm Analysis", time: "2 hours ago", status: "Completed" },
  { id: 2, query: "Summarize this PDF", context: "Document Processing", time: "4 hours ago", status: "Completed" },
  { id: 3, query: "Solve this MCQ", context: "Academic Logic", time: "5 hours ago", status: "Completed" },
  { id: 4, query: "Optimize this Code", context: "Performance Engineering", time: "Yesterday", status: "Completed" },
  { id: 5, query: "Analyze Website SEO", context: "Web Metrics", time: "Yesterday", status: "Completed" },
];

export default function HistoryPage() {
  const [search, setSearch] = useState("");

  const filteredHistory = HISTORY_DATA.filter((item) =>
    item.query.toLowerCase().includes(search.toLowerCase())
  );

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
        className="flex flex-col items-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          Intelligence Log.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Your active memory.
        </p>
      </motion.section>

      {/* Search Input (Raycast Style) */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center mb-24"
      >
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-accent/5 blur-xl group-hover:bg-accent/10 transition-colors duration-500 rounded-full" />
          <div className="relative flex items-center bg-transparent border-b border-[var(--border)] focus-within:border-accent/50 transition-colors pb-4 px-2">
            <Search className="w-5 h-5 text-text-muted group-focus-within:text-accent transition-colors mr-4" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-transparent border-none outline-none text-2xl font-light text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
            <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-widest bg-accent/10 px-2 py-1 rounded">
              <Command className="w-3 h-3" /> K
            </div>
          </div>
        </div>
      </motion.section>

      {/* History Feed */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full flex flex-col items-center"
      >
        {filteredHistory.length > 0 ? (
          <div className="flex flex-col items-center space-y-12 w-full max-w-2xl">
            {filteredHistory.map((item, index) => (
              <div key={item.id} className="w-full flex flex-col items-center">
                <div className="w-full group cursor-pointer flex flex-col sm:flex-row items-center sm:items-baseline justify-between text-center sm:text-left">
                  <div className="flex flex-col items-center sm:items-start">
                    <h3 className="text-xl md:text-2xl font-light text-text-primary group-hover:text-accent transition-colors">
                      {item.query}
                    </h3>
                    <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-2 block">
                      {item.context}
                    </span>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-end">
                    <span className="text-sm font-light text-text-muted">
                      {item.time}
                    </span>
                    <span className="text-[10px] text-success uppercase tracking-[0.2em] mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status}
                    </span>
                  </div>
                </div>

                {index !== filteredHistory.length - 1 && (
                  <div className="flex justify-center text-text-muted/10 mt-12">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full border border-text-muted/20 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-text-muted/50" />
            </div>
            <h3 className="text-2xl font-light text-text-primary mb-2">No memories found.</h3>
            <p className="text-sm text-text-muted tracking-[0.1em]">Your search query yielded empty results.</p>
          </motion.div>
        )}
      </motion.section>
      
      <div className="h-32" />
    </div>
  );
}
