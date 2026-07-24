"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { Wrench, Power, Calendar, MessageSquare, AlertTriangle, Clock, Shield, CheckCircle2 } from "lucide-react";

export default function AdminMaintenancePage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("Scheduled maintenance on July 20, 2024 from 2:00 AM to 4:00 AM UTC.");

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="heading-md text-text-primary">Maintenance</h1>
        <p className="text-text-muted text-sm mt-1">System maintenance controls and scheduling.</p>
      </motion.div>

      {/* Maintenance Toggle */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SpotlightCard
          className="p-6"
          spotlightColor={maintenanceMode ? "rgba(255, 59, 92, 0.06)" : "rgba(0, 255, 148, 0.04)"}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                maintenanceMode ? "bg-error/10 border-error/20" : "bg-success/10 border-success/20"
              }`}>
                {maintenanceMode ? <Wrench className="w-6 h-6 text-error" /> : <CheckCircle2 className="w-6 h-6 text-success" />}
              </div>
              <div>
                <h3 className="text-text-primary font-medium">Maintenance Mode</h3>
                <p className="text-text-muted text-xs">
                  {maintenanceMode ? "System is in maintenance mode. Users cannot access services." : "System is operational. All services are running normally."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-14 h-7 rounded-full transition-all relative ${
                maintenanceMode ? "bg-error/30" : "bg-success/30"
              }`}
            >
              <motion.div
                className={`w-6 h-6 rounded-full absolute top-0.5 ${maintenanceMode ? "bg-error" : "bg-success"}`}
                animate={{ left: maintenanceMode ? 30 : 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </button>
          </div>

          {maintenanceMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 rounded-lg bg-error/5 border border-error/10 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-error shrink-0" />
              <span className="text-error text-xs">Warning: All user-facing services are currently disabled.</span>
            </motion.div>
          )}
        </SpotlightCard>
      </motion.div>

      {/* Banner Message */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <MessageSquare className="w-4 h-4 text-accent" />
            <h3 className="text-text-primary text-sm font-medium">Maintenance Banner</h3>
          </div>
          <textarea
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-text-primary text-sm focus:outline-none focus:border-accent/40 transition-all resize-none mb-3"
          />
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-xs border border-accent/20 hover:bg-accent/15 transition-all">
              Publish Banner
            </button>
            <button className="px-4 py-2 rounded-lg bg-[var(--card)] text-text-muted text-xs border border-[var(--border)] hover:bg-[var(--card-hover)] transition-all">
              Clear Banner
            </button>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Scheduled Maintenance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Calendar className="w-4 h-4 text-accent" />
            <h3 className="text-text-primary text-sm font-medium">Scheduled Maintenance</h3>
          </div>
          <div className="space-y-3">
            {[
              { date: "Jul 20, 2024", time: "2:00 AM - 4:00 AM UTC", desc: "Database migration and index optimization", status: "upcoming" },
              { date: "Jul 27, 2024", time: "3:00 AM - 5:00 AM UTC", desc: "Infrastructure upgrade — moving to new GPU cluster", status: "upcoming" },
              { date: "Jul 13, 2024", time: "1:00 AM - 2:30 AM UTC", desc: "SSL certificate renewal", status: "completed" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === "upcoming" ? "bg-warning" : "bg-success"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm">{item.desc}</p>
                  <div className="flex items-center gap-2 mt-1 text-text-muted text-[10px]">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{item.date} • {item.time}</span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full capitalize ${
                  item.status === "upcoming" ? "bg-warning/10 text-warning border border-warning/20" : "bg-success/10 text-success border border-success/20"
                }`}>{item.status}</span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
