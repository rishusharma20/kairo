"use client";

import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { MOCK_CHART_DATA } from "@/lib/constants";
import { Crown, Users, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminPremiumPage() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="heading-md text-text-primary">Premium Management</h1>
        <p className="text-text-muted text-sm mt-1">Subscription analytics and plan management.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Subscribers", value: "4,820", icon: Users, color: "#00D4FF", change: "+18%" },
          { label: "Monthly Revenue", value: "$45,890", icon: DollarSign, color: "#FFB800", change: "+15%" },
          { label: "Churn Rate", value: "2.1%", icon: TrendingUp, color: "#10B981", change: "-0.3%" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <SpotlightCard className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}12`, border: `1px solid ${stat.color}20` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">{stat.change}</span>
              </div>
              <p className="text-2xl font-light text-text-primary">{stat.value}</p>
              <p className="text-text-muted text-xs mt-1">{stat.label}</p>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <SpotlightCard className="p-6">
          <h3 className="text-text-primary text-sm font-medium mb-6">Revenue by Month</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CHART_DATA.monthlyRevenue}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "12px", color: "#fafafa" }} />
                <Bar dataKey="revenue" fill="#FFB800" radius={[6, 6, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Plan Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <SpotlightCard className="p-6">
          <h3 className="text-text-primary text-sm font-medium mb-5">Plan Distribution</h3>
          <div className="space-y-4">
            {[
              { plan: "Free", users: 7630, percentage: 61, color: "var(--text-muted)" },
              { plan: "Pro", users: 3820, percentage: 31, color: "#00D4FF" },
              { plan: "Elite", users: 1000, percentage: 8, color: "#FFB800" },
            ].map((item) => (
              <div key={item.plan}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3" style={{ color: item.color }} />
                    <span className="text-text-secondary text-sm">{item.plan}</span>
                  </div>
                  <span className="text-text-muted text-xs">{item.users.toLocaleString()} users ({item.percentage}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--card)]">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: item.color }} initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}

