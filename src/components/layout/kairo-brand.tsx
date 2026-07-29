import React from "react";
import { cn } from "@/lib/utils";

interface KairoBrandProps {
  variant?: "default" | "admin" | "compact";
  className?: string;
}

export function KairoBrand({ variant = "default", className }: KairoBrandProps) {
  const isCompact = variant === "compact";
  const isAdmin = variant === "admin";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <img src="/logo-icon.png" alt="Kairo Logo" className="w-full h-full object-contain" />
      </div>
      
      {!isCompact && (
        <div className="flex flex-col justify-center">
          <span className="text-text-primary font-medium tracking-[0.15em] text-sm block leading-tight">
            KAIRO
          </span>
          {isAdmin && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 w-fit mt-0.5 leading-none font-bold tracking-wider">
              ADMIN
            </span>
          )}
        </div>
      )}
    </div>
  );
}
