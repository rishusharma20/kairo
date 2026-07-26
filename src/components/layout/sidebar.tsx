"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BarChart3, Clock, Crown, Users, HelpCircle,
  Settings, ChevronLeft, ChevronRight, LogOut, User, Activity,
  Code2, FileText, Wrench, Shield, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, BarChart3, Clock, Crown, Users, HelpCircle,
  Settings, Activity, Code2, FileText, Wrench, Shield, User, MessageSquare
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  items: readonly NavItem[];
  title?: string;
  badge?: string;
  user?: {
    name: string;
    email: string;
    plan: string;
  };
}

export function Sidebar({ items, title = "KAIRO", badge, user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--surface)]",
          "overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)] min-h-[64px]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                  <span className="text-accent font-bold text-sm">K</span>
                </div>
                <div>
                  <span className="text-text-primary font-medium tracking-[0.15em] text-sm block">
                    {title}
                  </span>
                  {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {badge}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group",
                  isActive
                    ? "text-accent bg-accent/8"
                    : "text-text-muted hover:text-text-primary hover:bg-[var(--card)]"
                )}
              >
                {/* Active glow indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-[18px] h-[18px] shrink-0", collapsed && "mx-auto")} />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex flex-col gap-2">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-[var(--card)] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
              <User className="w-3.5 h-3.5 text-accent" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-text-primary text-sm truncate">{user?.name || "User"}</p>
                  <p className="text-text-muted text-xs truncate capitalize">{user?.plan?.toLowerCase() || "Free"} Plan</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/auth/login';
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-destructive hover:bg-destructive/10 transition-all w-full text-left"
          >
            <LogOut className={cn("w-[18px] h-[18px] shrink-0", collapsed && "mx-auto")} />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border)]">
        <div className="flex items-center justify-around py-2 px-2">
          {items.slice(0, 4).map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-all",
                  isActive ? "text-accent" : "text-text-muted"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/auth/login';
            }}
            className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-all text-text-muted hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
