"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Code2, Search, GraduationCap, Globe, Sparkles } from "lucide-react";
import { useElementMousePosition } from "@/hooks/use-mouse-position";

const capabilities = [
  { icon: Code2, label: "Code", description: "Solve, debug, and optimize code in any language", color: "#00D4FF" },
  { icon: Search, label: "Research", description: "Summarize papers, extract insights, find connections", color: "#7C3AED" },
  { icon: GraduationCap, label: "Learn", description: "Explain concepts, generate MCQs, create study plans", color: "#10B981" },
  { icon: Globe, label: "Analyze", description: "Understand websites, decode data, interpret context", color: "#FFB800" },
  { icon: Sparkles, label: "Create", description: "Generate content, brainstorm ideas, draft responses", color: "#FF3B5C" },
];

export function IntelligenceGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-10%" });

  return (
    <section id="intelligence" ref={sectionRef} className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-caption text-text-muted block mb-4">Capabilities</span>
          <h2 className="heading-lg text-text-primary mb-4">
            One Shortcut, Infinite Possibilities
          </h2>
          <p className="text-text-muted text-body max-w-lg mx-auto">
            Hover to reveal what KAIRO can do for you.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {capabilities.map((cap, i) => (
            <CapabilityCard key={cap.label} capability={cap} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityCard({
  capability,
  index,
  isInView,
}: {
  capability: typeof capabilities[number];
  index: number;
  isInView: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, isInside } = useElementMousePosition(ref);
  const [hovered, setHovered] = useState(false);
  const Icon = capability.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-default"
    >
      <div
        className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 h-48 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden"
        style={{
          borderColor: hovered ? `${capability.color}30` : undefined,
          background: isInside
            ? `radial-gradient(300px circle at ${x}px ${y}px, ${capability.color}08, var(--card))`
            : undefined,
        }}
      >
        {/* Icon */}
        <motion.div
          animate={hovered ? { scale: 0.8, y: -8, opacity: 0.5 } : { scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-8 h-8 mb-3" style={{ color: capability.color }} />
        </motion.div>

        {/* Label */}
        <motion.span
          animate={hovered ? { y: -20 } : { y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-text-primary font-medium text-sm"
        >
          {capability.label}
        </motion.span>

        {/* Description — appears on hover */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-6 left-0 right-0 px-4 text-center text-text-muted text-xs leading-relaxed"
        >
          {capability.description}
        </motion.p>

        {/* Bottom glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${capability.color}40, transparent)`,
            opacity: hovered ? 1 : 0,
          }}
        />
      </div>
    </motion.div>
  );
}
