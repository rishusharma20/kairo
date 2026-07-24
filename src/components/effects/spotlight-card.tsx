"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementMousePosition } from "@/hooks/use-mouse-position";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(0, 212, 255, 0.08)",
  spotlightSize = 400,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, isInside } = useElementMousePosition(ref);

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-all duration-300",
        "hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]",
        className
      )}
      style={{
        background: isInside
          ? `radial-gradient(${spotlightSize}px circle at ${x}px ${y}px, ${spotlightColor}, var(--card))`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}
