"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Sparkles, Zap, Crown } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { SpotlightCard } from "@/components/effects/spotlight-card";

const planIcons: Record<string, React.ElementType> = {
  free: Zap,
  pro: Sparkles,
  elite: Crown,
};

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-10%" });

  return (
    <section id="premium" ref={sectionRef} className="relative py-32 px-6">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.02] blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-caption text-text-muted block mb-4">Premium</span>
          <h2 className="heading-lg text-text-primary mb-4">
            Choose Your Intelligence
          </h2>
          <p className="text-text-muted text-body max-w-lg mx-auto">
            Every plan unlocks a new level of thinking.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  index,
  isInView,
}: {
  plan: typeof PLANS[number];
  index: number;
  isInView: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = planIcons[plan.id] || Zap;
  const isPopular = "popular" in plan && plan.popular;
  const isElite = plan.id === "elite";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="px-3 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-medium tracking-wider uppercase border border-accent/20">
            Recommended
          </span>
        </div>
      )}

      <SpotlightCard
        className={`h-full transition-transform duration-500 ${
          hovered ? "scale-[1.02]" : ""
        } ${isPopular ? "border-accent/20" : ""}`}
        spotlightColor={
          isElite
            ? "rgba(255, 184, 0, 0.06)"
            : isPopular
            ? "rgba(0, 212, 255, 0.08)"
            : "rgba(255, 255, 255, 0.04)"
        }
      >
        <div className="p-8">
          {/* Plan icon & name */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: isElite
                  ? "rgba(255, 184, 0, 0.08)"
                  : isPopular
                  ? "rgba(0, 212, 255, 0.08)"
                  : "var(--card)",
                borderColor: isElite
                  ? "rgba(255, 184, 0, 0.15)"
                  : isPopular
                  ? "rgba(0, 212, 255, 0.15)"
                  : "var(--border)",
              }}
            >
              <Icon
                className="w-5 h-5"
                style={{
                  color: isElite ? "#FFB800" : isPopular ? "#00D4FF" : "var(--text-muted)",
                }}
              />
            </div>
            <div>
              <h3 className="text-text-primary font-medium">{plan.name}</h3>
              <p className="text-text-muted text-xs">{plan.tagline}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mt-6 mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-light text-text-primary">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
              </span>
              {plan.price > 0 && (
                <span className="text-text-muted text-sm">/{plan.period}</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[var(--border)] mb-6" />

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <Check
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{
                    color: isElite ? "#FFB800" : isPopular ? "#00D4FF" : "#00FF94",
                  }}
                />
                <span className="text-text-secondary">{feature}</span>
              </li>
            ))}
            {plan.limitations.map((limitation) => (
              <li key={limitation} className="flex items-start gap-2.5 text-sm">
                <X className="w-4 h-4 shrink-0 mt-0.5 text-text-muted/50" />
                <span className="text-text-muted">{limitation}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              isPopular
                ? "bg-accent/15 text-accent border border-accent/20 hover:bg-accent/20"
                : isElite
                ? "bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20 hover:bg-[#FFB800]/15"
                : "bg-[var(--card)] text-text-primary border border-[var(--border)] hover:bg-[var(--card-hover)]"
            }`}
          >
            {plan.price === 0 ? "Get Started Free" : `Upgrade to ${plan.name}`}
          </button>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
