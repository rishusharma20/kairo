import { getSession } from "@/lib/auth";
import { getCachedUser, getCachedUsage } from "@/lib/services/user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ShieldAlert } from "lucide-react";

export default async function DashboardHome() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const user = await getCachedUser(session.userId);

  if (!user) {
    redirect("/auth/login");
  }

  const usage = await getCachedUsage(user.id);

  const requestsUsed = usage ? usage.requests_used : 0;
  const requestsRemaining = Math.max(0, user.daily_limit - requestsUsed);
  const usagePercentage = Math.min(100, Math.round((requestsUsed / user.daily_limit) * 100));

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Welcome Area */}
      <section className="space-y-2">
        <h1 className="heading-md break-words">Welcome back, {user.full_name}</h1>
        <p className="text-text-muted">Here is your daily intelligence snapshot.</p>
      </section>

      {/* Status Warning (If Blocked) */}
      {user.status === "BLOCKED" && (
        <div className="w-full p-4 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning">Your account has been temporarily blocked by an administrator. Some features are disabled.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Plan Card */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-text-muted text-sm font-medium tracking-wide uppercase mb-6">Current Plan</h2>
          
          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-tight">
              <span className={user.plan === "PREMIUM" ? "gradient-text-gold" : "text-text-primary"}>
                {user.plan}
              </span>
            </h3>
            <p className="text-sm text-text-muted">
              {user.daily_limit.toLocaleString()} requests per day
            </p>
          </div>

          {user.plan === "FREE" && (
            <div className="mt-8">
              <Link 
                href="/dashboard/billing"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-accent/10 text-accent text-sm font-medium border border-accent/20 hover:bg-accent/20 transition-colors w-full sm:w-auto"
              >
                Upgrade to Premium
              </Link>
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] relative overflow-hidden group">
           <div className="absolute top-6 right-6">
             <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-success shadow-[0_0_10px_rgba(0,255,148,0.5)]' : 'bg-warning shadow-[0_0_10px_rgba(255,184,0,0.5)]'} animate-pulse`} />
           </div>

           <h2 className="text-text-muted text-sm font-medium tracking-wide uppercase mb-6 flex items-center gap-2">
             <Activity className="w-4 h-4" />
             Today's Usage
           </h2>

           <div className="space-y-6">
             <div className="flex items-baseline gap-2">
               <span className="text-4xl font-bold text-text-primary">{requestsRemaining.toLocaleString()}</span>
               <span className="text-sm text-text-muted">remaining</span>
             </div>

             <div className="space-y-2">
               <div className="flex justify-between text-xs text-text-muted font-mono">
                 <span>{requestsUsed.toLocaleString()} used</span>
                 <span>{user.daily_limit.toLocaleString()} limit</span>
               </div>
               
               {/* Progress Bar */}
               <div className="w-full h-2 rounded-full bg-[var(--card-hover)] overflow-hidden">
                 <div 
                   className="h-full bg-accent transition-all duration-1000 ease-out"
                   style={{ width: `${usagePercentage}%` }}
                 />
               </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
