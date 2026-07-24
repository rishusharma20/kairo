"use client";

import { motion } from "framer-motion";
import { Terminal, Command, ArrowDown } from "lucide-react";
import { useState } from "react";

const MOCK_LOGS = [
  { id: "req_001", time: "14:24:01", status: "200", user: "rishu@gmail.com", model: "gemini-2.0-flash", latency: "14ms" },
  { id: "req_002", time: "14:23:59", status: "200", user: "system_auth", model: "auth_service", latency: "42ms" },
  { id: "req_003", time: "14:23:45", status: "429", user: "alex@example.com", model: "gemini-2.0-pro", latency: "5ms" },
  { id: "req_004", time: "14:22:10", status: "500", user: "sarah@example.com", model: "db_query", latency: "1402ms" },
  { id: "req_005", time: "14:20:00", status: "200", user: "rishu@gmail.com", model: "gemini-2.0-flash", latency: "12ms" },
];

export default function AdminLogsPage() {
  const [search, setSearch] = useState("");

  const filteredLogs = MOCK_LOGS.filter((log) =>
    log.user.toLowerCase().includes(search.toLowerCase()) || log.status.includes(search)
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
        className="flex flex-col items-center mb-16 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          System Streams.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Live Request Logs.
        </p>
      </motion.section>

      {/* Terminal Search */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-3xl flex flex-col items-center mb-16"
      >
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-destructive/5 blur-xl group-hover:bg-destructive/10 transition-colors duration-500 rounded-full" />
          <div className="relative flex items-center bg-transparent border-b border-[var(--border)] focus-within:border-destructive/50 transition-colors pb-4 px-2">
            <Terminal className="w-5 h-5 text-text-muted group-focus-within:text-destructive transition-colors mr-4" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="grep logs..."
              className="w-full bg-transparent border-none outline-none text-2xl font-mono font-light text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
            <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-widest bg-destructive/10 px-2 py-1 rounded">
              <Command className="w-3 h-3" /> F
            </div>
          </div>
        </div>
      </motion.section>

      {/* Terminal Output */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full flex flex-col items-center"
      >
        {filteredLogs.length > 0 ? (
          <div className="flex flex-col space-y-6 w-full max-w-4xl bg-black/40 border border-[var(--border)] rounded-2xl p-8 font-mono text-sm shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 opacity-50 text-[10px] uppercase tracking-widest pb-4 border-b border-[var(--border)]">
              <div className="w-24">TIME</div>
              <div className="w-16">STAT</div>
              <div className="w-24">LATENCY</div>
              <div className="flex-1">ORIGIN</div>
              <div className="w-48 text-right">TARGET</div>
            </div>
            
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 hover:bg-white/5 p-2 -mx-2 rounded transition-colors group cursor-default">
                <div className="w-24 text-text-muted">{log.time}</div>
                <div className={`w-16 ${log.status === "200" ? "text-success" : "text-destructive"}`}>
                  [{log.status}]
                </div>
                <div className="w-24 text-accent">{log.latency}</div>
                <div className="flex-1 text-text-primary truncate">{log.user}</div>
                <div className="w-48 text-text-muted text-right truncate group-hover:text-text-primary transition-colors">{log.model}</div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full border border-destructive/20 flex items-center justify-center mb-6">
              <Terminal className="w-6 h-6 text-destructive/50" />
            </div>
            <h3 className="text-2xl font-light text-text-primary mb-2 font-mono">EOF</h3>
            <p className="text-sm text-text-muted tracking-[0.1em] font-mono">No matching streams found.</p>
          </motion.div>
        )}
      </motion.section>
      
      <div className="h-32" />
    </div>
  );
}
