"use client";

import { useMousePosition } from "@/hooks/use-mouse-position";

export function MouseSpotlight() {
  const { x, y } = useMousePosition();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background: `radial-gradient(800px circle at ${x}px ${y}px, rgba(0, 212, 255, 0.03), transparent 60%)`,
      }}
    />
  );
}
