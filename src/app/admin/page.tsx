import { prisma } from "@/lib/db";
import { getPaymentRequests } from "@/lib/services/payment";
import { Users, Activity, Shield, Clock, Crown } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AdminVerificationModal } from "@/components/admin/admin-verification-modal";

export default async function AdminOverview() {
  const session = await getSession();
  
  if (!session?.adminSecondFactorVerified) {
    return <AdminVerificationModal />;
  }

  // Fetch real authoritative data for the overview
  const totalUsers = await prisma.user.count();
  const freeUsers = await prisma.user.count({ where: { plan: "FREE" } });
  const premiumUsers = await prisma.user.count({ where: { plan: "PREMIUM" } });
  
  // Phase 5 integration: Fetch authoritative pending requests from existing backend
  const pendingRequests = await getPaymentRequests("PENDING");
  const pendingPayments = pendingRequests.length;

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)]">
        <h1 className="heading-md">Control Center Overview</h1>
        <p className="text-text-muted">System metrics and platform status.</p>
      </section>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Users */}
        <div className="p-6 rounded-2xl glass border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Total Users</h3>
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="w-5 h-5 text-accent" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              {totalUsers.toLocaleString()}
            </h2>
            <p className="text-xs text-success flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Platform Accounts
            </p>
          </div>
        </div>

        {/* Free Users */}
        <div className="p-6 rounded-2xl glass border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Free Plan</h3>
            <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <Shield className="w-5 h-5 text-text-muted" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              {freeUsers.toLocaleString()}
            </h2>
            <p className="text-xs text-text-muted flex items-center gap-1">
              Standard Quota (1/day)
            </p>
          </div>
        </div>

        {/* Premium Users */}
        <div className="p-6 rounded-2xl glass border border-[var(--border)] space-y-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Premium Plan</h3>
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
              <Crown className="w-5 h-5 text-accent" />
            </div>
          </div>
          <div className="relative space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              {premiumUsers.toLocaleString()}
            </h2>
            <p className="text-xs text-text-muted flex items-center gap-1">
              High Quota (3000/day)
            </p>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-6 rounded-2xl glass border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Pending Payments</h3>
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
              <Clock className="w-5 h-5 text-warning" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              {pendingPayments}
            </h2>
            <p className="text-xs text-warning flex items-center gap-1">
              Requires Manual Verification
            </p>
          </div>
        </div>

      </div>

      {/* System Status Banner */}
      <div className="pt-8">
        <div className="p-4 rounded-xl glass border border-success/20 bg-success/5 flex items-start gap-4">
          <div className="p-2 rounded-full bg-success/10 border border-success/20 shrink-0">
            <Activity className="w-5 h-5 text-success" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-success">All Systems Operational</h3>
            <p className="text-xs text-text-muted">
              The Gemini Key Manager and Background Processing Engine are currently healthy and responding normally.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
