"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { Code2, BookOpen, BriefcaseBusiness, CircleCheckBig } from "lucide-react";

const demos = [
  {
    id: "code",
    icon: Code2,
    title: "Solve Coding Problems",
    steps: [
      { text: "// Two Sum — find indices that add up to target", type: "code" as const },
      { text: "Thinking...", type: "status" as const },
      { text: "Analyzing time complexity...", type: "status" as const },
      {
        text: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
        type: "code" as const,
      },
      { text: "⏱ Time Complexity: O(n)", type: "result" as const },
      { text: "💾 Space Complexity: O(n)", type: "result" as const },
      { text: "✓ Optimized Solution Generated.", type: "success" as const },
    ],
  },
  {
    id: "research",
    icon: BookOpen,
    title: "Research Papers",
    steps: [
      { text: '"Attention Is All You Need" — Vaswani et al.', type: "code" as const },
      { text: "Reading paper...", type: "status" as const },
      { text: "Summarizing...", type: "status" as const },
      {
        text: "The paper introduces the Transformer architecture, replacing recurrent layers with self-attention mechanisms for sequence-to-sequence tasks.",
        type: "code" as const,
      },
      { text: "🔑 Key Insight 1: Self-attention enables parallel processing", type: "result" as const },
      { text: "🔑 Key Insight 2: Multi-head attention captures diverse patterns", type: "result" as const },
      { text: "🔑 Key Insight 3: Positional encoding preserves sequence order", type: "result" as const },
      { text: "✓ 5 Key Insights Generated.", type: "success" as const },
    ],
  },
  {
    id: "interview",
    icon: BriefcaseBusiness,
    title: "Interview Questions",
    steps: [
      { text: '"Tell me about a time you led a challenging project"', type: "code" as const },
      { text: "Generating STAR response...", type: "status" as const },
      { text: "Situation: Led a cross-functional team of 8 to migrate legacy monolith to microservices under a tight 3-month deadline.", type: "code" as const },
      { text: "Task: Design architecture, manage team alignment, and ensure zero-downtime migration.", type: "code" as const },
      { text: "Action: Implemented feature flags, set up CI/CD pipelines, and ran weekly sync meetings.", type: "code" as const },
      { text: "Result: Completed 2 weeks early, reduced latency by 40%, and improved deployment frequency by 5x.", type: "code" as const },
      { text: "✓ STAR Method Generated.", type: "success" as const },
    ],
  },
  {
    id: "mcq",
    icon: CircleCheckBig,
    title: "MCQs",
    steps: [
      { text: "What is the time complexity of Binary Search?", type: "code" as const },
      { text: "A) O(n)  B) O(log n)  C) O(n²)  D) O(1)", type: "code" as const },
      { text: "Analyzing options...", type: "status" as const },
      { text: "✓ Correct Answer: B) O(log n)", type: "success" as const },
      {
        text: "Binary Search halves the search space each iteration, resulting in logarithmic time complexity.",
        type: "result" as const,
      },
    ],
  },
];

export function LiveExperience() {
  return (
    <section id="experience" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-caption text-text-muted block mb-4">Live Experience</span>
          <h2 className="heading-lg text-text-primary mb-4">
            Watch Intelligence Work
          </h2>
          <p className="text-text-muted text-body max-w-lg mx-auto">
            Not feature cards. Not screenshots. Real demonstrations of KAIRO thinking beside you.
          </p>
        </motion.div>

        {/* Demo grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demos.map((demo, index) => (
            <DemoCard key={demo.id} demo={demo} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoCard({ demo, index }: { demo: typeof demos[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });
  const [currentStep, setCurrentStep] = useState(-1);
  const [displayedLines, setDisplayedLines] = useState<typeof demo.steps>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const startAnimation = useCallback(() => {
    setCurrentStep(-1);
    setDisplayedLines([]);

    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    demo.steps.forEach((step, i) => {
      const delay = i * (step.type === "status" ? 800 : step.type === "code" ? 600 : 400);
      const timeout = setTimeout(() => {
        setCurrentStep(i);
        setDisplayedLines((prev) => [...prev, step]);
      }, delay + 300);
      timeoutsRef.current.push(timeout);
    });
  }, [demo.steps]);

  useEffect(() => {
    if (isInView) {
      const initialDelay = setTimeout(() => startAnimation(), index * 200);
      timeoutsRef.current.push(initialDelay);
    }
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [isInView, startAnimation, index]);

  const Icon = demo.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
    >
      <SpotlightCard className="h-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent/8 border border-accent/15 flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-text-primary font-medium text-sm">{demo.title}</h3>
          </div>

          {/* Terminal */}
          <div className="rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {/* Terminal dots */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
              <span className="ml-3 text-[10px] text-[rgba(255,255,255,0.3)] font-mono">kairo</span>
            </div>

            {/* Lines */}
            <div className="p-4 font-mono text-xs leading-relaxed min-h-[200px] max-h-[300px] overflow-y-auto">
              {displayedLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-1.5 ${
                    line.type === "status"
                      ? "text-[rgba(255,255,255,0.35)] italic"
                      : line.type === "success"
                      ? "text-[#00FF94] font-medium mt-2"
                      : line.type === "result"
                      ? "text-[#00D4FF]"
                      : "text-[rgba(255,255,255,0.7)]"
                  }`}
                >
                  {line.type === "code" ? (
                    <pre className="whitespace-pre-wrap">{line.text}</pre>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </motion.div>
              ))}

              {/* Cursor */}
              {currentStep < demo.steps.length - 1 && isInView && (
                <motion.span
                  className="inline-block w-2 h-4 bg-accent/60"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
