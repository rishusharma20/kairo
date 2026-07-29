"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { KairoBrand } from "@/components/layout/kairo-brand";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "py-3 glass border-b border-[var(--border)]"
            : "py-5 bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <KairoBrand variant="default" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-text-muted hover:text-text-primary text-sm transition-colors duration-300 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-300"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* CTA */}
            <Link
              href="/auth/login"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium border border-accent/20 hover:bg-accent/15 hover:border-accent/30 transition-all duration-300"
            >
              <span>Get Started</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 font-mono">
                ⌥D
              </kbd>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 pt-20 bg-[var(--background)]/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col items-center gap-8 pt-12">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-2xl font-light transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="mt-4 px-8 py-3 rounded-lg bg-accent/10 text-accent text-lg border border-accent/20 hover:bg-accent/15 transition-all"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
