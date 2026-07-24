"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function KairoNav() {
  const pathname = usePathname();

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
      className="w-full fixed top-0 left-0 z-50 flex items-center justify-between px-8 py-6 pointer-events-none"
    >
      <Link href="/dashboard" className="pointer-events-auto flex flex-col items-start group">
        <span className="text-text-primary/70 font-medium tracking-[0.3em] text-xs uppercase group-hover:text-accent transition-colors duration-500">
          KAIRO
        </span>
      </Link>

      <div className="flex items-center gap-8 pointer-events-auto">
        {DASHBOARD_NAV.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[10px] uppercase tracking-[0.2em] transition-colors duration-300",
                isActive ? "text-accent" : "text-text-muted hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <Link href="/dashboard/profile" className="pointer-events-auto flex items-center gap-2 group">
         <span className="text-text-muted text-[10px] uppercase tracking-[0.2em] group-hover:text-text-primary transition-colors duration-300">
           Pro Active
         </span>
         <div className="w-2 h-2 rounded-full bg-accent/50 group-hover:bg-accent animate-pulse" />
      </Link>
    </motion.nav>
  );
}
