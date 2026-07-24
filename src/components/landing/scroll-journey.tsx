"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { SCROLL_JOURNEY_STEPS } from "@/lib/constants";

export function ScrollJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={containerRef} className="relative" style={{ height: `${SCROLL_JOURNEY_STEPS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background pulse */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.08, 0]),
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent blur-[200px]" />
        </motion.div>

        {/* Progress bar */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 h-40 w-[2px] bg-[var(--border)] rounded-full hidden md:block">
          <motion.div
            className="w-full bg-accent rounded-full origin-top"
            style={{ scaleY: scrollYProgress }}
          />
        </div>

        {/* Steps */}
        {SCROLL_JOURNEY_STEPS.map((step, index) => {
          const stepProgress = index / (SCROLL_JOURNEY_STEPS.length - 1);
          // Do not clamp with Math.max/min to ensure strictly increasing arrays for Framer Motion
          const rangeStart = stepProgress - 0.08;
          const rangePeak = stepProgress;
          const rangeEnd = stepProgress + 0.08;

          return (
            <ScrollStep
              key={index}
              text={step.text}
              scale={step.scale}
              scrollYProgress={scrollYProgress}
              rangeStart={rangeStart}
              rangePeak={rangePeak}
              rangeEnd={rangeEnd}
              isLast={index === SCROLL_JOURNEY_STEPS.length - 1}
              isFirst={index === 0}
            />
          );
        })}
      </div>
    </section>
  );
}

function ScrollStep({
  text,
  scale: targetScale,
  scrollYProgress,
  rangeStart,
  rangePeak,
  rangeEnd,
  isLast,
  isFirst,
}: {
  text: string;
  scale: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  rangeStart: number;
  rangePeak: number;
  rangeEnd: number;
  isLast: boolean;
  isFirst: boolean;
}) {
  // Ensure Framer Motion receives strictly monotonically increasing inputs clamped to [0, 1]
  // to avoid WAAPI keyframe offset errors.
  const inputOpacity = isFirst 
    ? [0, Math.max(0.01, rangeEnd)] 
    : isLast 
    ? [Math.min(0.99, rangeStart), 1] 
    : [rangeStart, rangePeak, rangeEnd];

  const outputOpacity = isFirst 
    ? [1, 0.15] 
    : isLast 
    ? [0, 1] 
    : [0, 1, 0];
  const opacity = useTransform(scrollYProgress, inputOpacity, outputOpacity);

  const inputScale = isFirst 
    ? [0, Math.max(0.01, rangeEnd)] 
    : isLast 
    ? [Math.min(0.99, rangeStart), 1] 
    : [rangeStart, rangePeak, rangeEnd];

  const outputScale = isFirst 
    ? [targetScale, targetScale * 1.2] 
    : isLast 
    ? [0.8, targetScale] 
    : [0.8, targetScale, 0.9];
  const scale = useTransform(scrollYProgress, inputScale, outputScale);

  const inputY = isFirst 
    ? [0, Math.max(0.01, rangeEnd)] 
    : isLast 
    ? [Math.min(0.99, rangeStart), 1] 
    : [rangeStart, rangePeak, rangeEnd];

  const outputY = isFirst 
    ? [0, 0] 
    : isLast 
    ? [40, 0] 
    : [40, 0, -30];
  const y = useTransform(scrollYProgress, inputY, outputY);

  const inputBlur = isFirst ? [0, Math.max(0.01, rangeEnd)] : [0, 1];
  const outputBlur = isFirst ? [0, 16] : [0, 0];
  const blur = useTransform(scrollYProgress, inputBlur, outputBlur);
  const filter = useMotionTemplate`blur(${blur}px)`;

  const isThinking = text.includes("...");
  const isEmotional = text === "Never Left." || text === "Always Beside You.";

  return (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none px-6 ${isFirst ? 'z-0' : 'z-10'}`}
      style={{ opacity, scale, y, filter }}
    >
      <p
        className={`text-center max-w-3xl ${
          isFirst
            ? "text-6xl md:text-8xl font-extralight tracking-[0.3em] text-glow-strong"
            : isThinking
            ? "text-2xl md:text-4xl font-light text-text-muted font-mono tracking-wider"
            : isEmotional
            ? "text-3xl md:text-5xl font-extralight text-text-primary text-glow"
            : "text-3xl md:text-5xl font-light text-text-secondary"
        }`}
      >
        {text}
      </p>
    </motion.div>
  );
}
