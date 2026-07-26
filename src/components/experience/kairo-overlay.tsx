"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Command, CornerDownLeft, Sparkles, FileText, Type } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskType = "ask" | "page" | "text" | null;
type FlowState = "idle" | "thinking" | "analyzing" | "generating" | "done";

interface KairoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  context: { pageText: string; selectedText: string };
}

export function KairoOverlay({ isOpen, onClose, context }: KairoOverlayProps) {
  const [task, setTask] = useState<TaskType>(null);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        setTask(null);
        setFlow("idle");
        setInput("");
        setResponse("");
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input && !task) return;

    const currentTask = task || "ask";
    if (currentTask === "text" && !context.selectedText) {
      setResponse("Error: No text selected on the page.");
      setFlow("done");
      return;
    }
    
    setFlow(currentTask === "page" ? "analyzing" : "thinking");
    
    try {
      const res = await fetch("/api/extension/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input,
          type: currentTask,
          context: context,
        })
      });
      
      const data = await res.json();
      
      setFlow("generating");
      
      // Artificial delay just for the cinematic generating effect
      setTimeout(() => {
        setFlow("done");
        if (!res.ok) {
          setResponse(`Error: ${data.error}`);
        } else {
          setResponse(data.data.response);
        }
      }, 600);
      
    } catch {
      setFlow("done");
      setResponse("Critical Error: Intelligence disconnected.");
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0, scale: 0.98, filter: "blur(10px)" },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, scale: 0.98, filter: "blur(10px)", transition: { duration: 0.3 } },
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Dim Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Main Overlay Window */}
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-3xl bg-[var(--background)]/80 backdrop-blur-3xl border border-[var(--border)]/50 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Glow Effects inside window */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col min-h-[120px] p-8">
          
          <AnimatePresence mode="wait">
            {flow === "idle" && (
              <motion.form 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col"
              >
                <div className="flex items-center gap-4 mb-6 text-text-muted">
                  <Command className="w-5 h-5 text-accent" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={task === "page" ? "Ask about this page..." : task === "text" ? "Ask about selected text..." : "Ask KAIRO anything..."}
                    className="w-full bg-transparent border-none outline-none text-3xl font-extralight text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
                  />
                </div>
                
                <div className="flex items-center gap-6 mt-4">
                  <button 
                    type="button"
                    onClick={() => setTask("page")}
                    className={cn(
                      "flex items-center gap-2 text-xs uppercase tracking-[0.2em] transition-colors duration-300",
                      task === "page" ? "text-accent" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <FileText className="w-4 h-4" /> Page Analysis
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTask("text")}
                    className={cn(
                      "flex items-center gap-2 text-xs uppercase tracking-[0.2em] transition-colors duration-300",
                      task === "text" ? "text-accent" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <Type className="w-4 h-4" /> Selected Text
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTask(null)}
                    className={cn(
                      "flex items-center gap-2 text-xs uppercase tracking-[0.2em] transition-colors duration-300",
                      task === null ? "text-accent" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <Sparkles className="w-4 h-4" /> General
                  </button>

                  <div className="flex-1" />
                  <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-widest opacity-50">
                    <CornerDownLeft className="w-3 h-3" /> Return
                  </div>
                </div>
              </motion.form>
            )}

            {(flow === "thinking" || flow === "analyzing" || flow === "generating") && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span className="text-xl font-light text-text-primary tracking-widest">
                    {flow === "thinking" && "Thinking..."}
                    {flow === "analyzing" && "Analyzing context..."}
                    {flow === "generating" && "Generating..."}
                  </span>
                </div>
              </motion.div>
            )}

            {flow === "done" && (
              <motion.div 
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="text-xs text-text-muted uppercase tracking-[0.3em]">Intelligence Synced.</span>
                </div>
                
                <p className="text-2xl font-light text-text-primary leading-relaxed">
                  {response}
                </p>

                <div className="flex justify-end mt-12">
                  <span className="text-[10px] text-text-muted uppercase tracking-[0.2em]">Press Esc to close</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
