"use client";

import { cn } from "@/lib/utils";

interface GlowBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  borderRadius?: string;
  animate?: boolean;
}

export function GlowBorder({
  children,
  className,
  glowColor = "var(--accent)",
  borderRadius = "var(--radius-lg)",
  animate = true,
}: GlowBorderProps) {
  return (
    <div
      className={cn("relative p-[1px] overflow-hidden group", className)}
      style={{ borderRadius }}
    >
      {/* Animated gradient border */}
      <div
        className={cn(
          "absolute inset-0",
          animate && "animate-border-rotate"
        )}
        style={{
          borderRadius,
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, ${glowColor}, transparent 60%)`,
        }}
      />
      {/* Glow blur behind */}
      <div
        className="absolute inset-0 opacity-40 blur-xl"
        style={{
          borderRadius,
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, ${glowColor}, transparent 60%)`,
        }}
      />
      {/* Content */}
      <div
        className="relative bg-[var(--surface)]"
        style={{ borderRadius }}
      >
        {children}
      </div>
    </div>
  );
}
