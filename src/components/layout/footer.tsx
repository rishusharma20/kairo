"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: "Features", href: "#experience" },
      { label: "Premium", href: "#premium" },
      { label: "Extension", href: "#" },
      { label: "API", href: "#" },
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
    resources: [
      { label: "Documentation", href: "#" },
      { label: "Support", href: "#" },
      { label: "Status", href: "#" },
      { label: "Changelog", href: "#" },
    ],
    legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  };

  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center border border-accent/20">
                <span className="text-accent font-bold text-xs tracking-wider">K</span>
              </div>
              <span className="text-text-primary font-medium tracking-[0.2em] text-sm">
                KAIRO
              </span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-[200px]">
              Your invisible intelligence. Always beside you.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-text-muted hover:text-text-primary text-sm transition-colors duration-200"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            © {currentYear} KAIRO. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-success"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-text-muted text-xs">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
