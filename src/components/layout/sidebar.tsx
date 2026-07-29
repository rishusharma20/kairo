"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BarChart3, Clock, Crown, Users, HelpCircle,
  Settings, ChevronLeft, ChevronRight, LogOut, User, Activity,
  Code2, FileText, Wrench, Shield, MessageSquare, Puzzle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KairoBrand } from "@/components/layout/kairo-brand";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, BarChart3, Clock, Crown, Users, HelpCircle,
  Settings, Activity, Code2, FileText, Wrench, Shield, User, MessageSquare, Puzzle
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
                <KairoBrand variant={badge ? "admin" : "default"} />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all bg-transparent"
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

            if (item.href === "#get-extension") {
              return (
                <button
                  key={item.href}
                  onClick={() => setIsModalOpen(true)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group border-none bg-transparent w-full text-left cursor-pointer",
                    "text-text-muted hover:text-text-primary hover:bg-[var(--card)]"
                  )}
                >
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
                </button>
              );
            }

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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-destructive hover:bg-destructive/10 transition-all w-full text-left bg-transparent border-none cursor-pointer"
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
          {items.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            if (item.href === "#get-extension") {
              return (
                <button
                  key={item.href}
                  onClick={() => setIsModalOpen(true)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-all border-none bg-transparent cursor-pointer text-text-muted hover:text-text-primary"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            }

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
            className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-all text-text-muted hover:text-destructive bg-transparent border-none cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>
      </nav>

      {/* Get Extension Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-[100]"
            >
              {/* Close button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 bg-transparent border-none cursor-pointer rounded-md transition-colors"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              {/* Scrollable Container */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Header info */}
                <div className="text-center space-y-2 mt-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 overflow-hidden">
                    <img src="/logo-icon.png" alt="Kairo logo" className="w-12 h-12 object-contain" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary">Kairo for Chrome</h3>
                  <p className="text-sm text-text-muted">Your AI assistant, wherever you work.</p>
                </div>

                {/* Primary CTA */}
                <div className="text-center">
                  <a
                    href="/downloads/kairo-extension-1.1.0.zip"
                    download
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-accent text-[var(--background)] font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm no-underline cursor-pointer"
                  >
                    Download Extension
                  </a>
                  <div className="mt-2 text-xs text-text-muted flex items-center justify-center gap-4">
                    <span>Version 1.1.0</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                    <span>Chrome / Chromium</span>
                  </div>
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Installation Guide */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted text-left">How to Install</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">01</span>
                      <p className="text-sm text-text-primary leading-relaxed m-0 text-left">Download the extension and extract the ZIP file.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">02</span>
                      <p className="text-sm text-text-primary leading-relaxed m-0 text-left">Open <code className="text-xs text-accent bg-accent/5 px-1 py-0.5 rounded">chrome://extensions</code> in your browser.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">03</span>
                      <p className="text-sm text-text-primary leading-relaxed m-0 text-left">Enable <strong>Developer mode</strong> in the top-right corner.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">04</span>
                      <p className="text-sm text-text-primary leading-relaxed m-0 text-left">Click <strong>Load unpacked</strong> in the top-left corner.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">05</span>
                      <p className="text-sm text-text-primary leading-relaxed m-0 text-left">Select the extracted Kairo extension folder.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Keyboard Shortcut Assist */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted text-left">Open Kairo</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
                      <span className="text-xs text-text-muted block mb-1">Mac</span>
                      <kbd className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono text-text-primary">⌥ + D</kbd>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
                      <span className="text-xs text-text-muted block mb-1">Windows/Linux</span>
                      <kbd className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs font-mono text-text-primary">Alt + D</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
