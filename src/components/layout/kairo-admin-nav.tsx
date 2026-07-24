"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { label: "Users", href: "/admin/users" },
  { label: "Premium", href: "/admin/premium" },
  { label: "API", href: "/admin/api" },
  { label: "Logs", href: "/admin/logs" },
  { label: "System", href: "/admin/system" },
];

export function KairoAdminNav() {
  const pathname = usePathname();

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
      className="w-full fixed top-0 left-0 z-50 flex items-center justify-between px-8 py-6 pointer-events-none"
    >
      <Link href="/admin" className="pointer-events-auto flex flex-col items-start group">
        <span className="text-destructive/70 font-medium tracking-[0.3em] text-xs uppercase group-hover:text-destructive transition-colors duration-500">
          CONTROL CENTER
        </span>
      </Link>

      <div className="flex items-center gap-8 pointer-events-auto">
        {ADMIN_NAV.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[10px] uppercase tracking-[0.2em] transition-colors duration-300",
                isActive ? "text-destructive" : "text-text-muted hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="pointer-events-auto flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-text-muted text-[10px] uppercase tracking-[0.2em] group-hover:text-text-primary transition-colors duration-300">
            Root Access
          </span>
          <div className="w-2 h-2 rounded-full bg-destructive/50 group-hover:bg-destructive animate-pulse" />
        </Link>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/auth/login';
          }}
          className="text-text-muted text-[10px] uppercase tracking-[0.2em] hover:text-destructive transition-colors duration-300"
        >
          Logout
        </button>
      </div>
    </motion.nav>
  );
}
