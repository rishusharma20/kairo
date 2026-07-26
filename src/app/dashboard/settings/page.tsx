import { getSession } from "@/lib/auth";
import { getCachedUser } from "@/lib/services/user";
import { redirect } from "next/navigation";
import { Shield, Key, Bell, LayoutDashboard } from "lucide-react";

export default async function SettingsDashboard() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const user = await getCachedUser(session.userId);

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Settings Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)]">
        <h1 className="heading-md">Settings</h1>
        <p className="text-text-muted">View your current account configuration and preferences.</p>
      </section>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Authentication Mode */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] bg-[var(--surface)]/30 space-y-4">
          <div className="flex items-center gap-3 text-text-primary">
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-medium">Authentication</h3>
          </div>
          <p className="text-sm text-text-muted">
            Your account is secured using standard Email & Password authentication.
          </p>
          <div className="pt-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-text-muted">
              Standard Auth Active
            </div>
          </div>
        </div>

        {/* Plan Configuration */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] bg-[var(--surface)]/30 space-y-4">
          <div className="flex items-center gap-3 text-text-primary">
            <div className="p-2 rounded-lg bg-accent/10">
              <LayoutDashboard className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-medium">Plan Level</h3>
          </div>
          <p className="text-sm text-text-muted">
            Your current subscription tier determines your Gemini Key limits and daily request quota.
          </p>
          <div className="pt-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-bold text-text-primary">
              <span className={user.plan === "PREMIUM" ? "gradient-text-gold" : ""}>
                {user.plan}
              </span>
            </div>
          </div>
        </div>

        {/* Notification Config (Placeholder for UI consistency) */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] bg-[var(--surface)]/30 space-y-4 opacity-50 grayscale">
          <div className="flex items-center justify-between text-text-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--border)]">
                <Bell className="w-5 h-5 text-text-muted" />
              </div>
              <h3 className="font-medium text-text-muted">Notifications</h3>
            </div>
            <span className="text-xs uppercase tracking-wider font-bold text-text-muted bg-[var(--border)] px-2 py-1 rounded">Disabled</span>
          </div>
          <p className="text-sm text-text-muted">
            Email and push notifications are currently unavailable in this region.
          </p>
        </div>

        {/* API Key Config (Placeholder for UI consistency) */}
        <div className="p-6 rounded-2xl glass border-[var(--border)] bg-[var(--surface)]/30 space-y-4 opacity-50 grayscale">
          <div className="flex items-center justify-between text-text-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--border)]">
                <Key className="w-5 h-5 text-text-muted" />
              </div>
              <h3 className="font-medium text-text-muted">Custom API Keys</h3>
            </div>
            <span className="text-xs uppercase tracking-wider font-bold text-text-muted bg-[var(--border)] px-2 py-1 rounded">Locked</span>
          </div>
          <p className="text-sm text-text-muted">
            BYOK (Bring Your Own Key) capabilities are restricted to enterprise custom deployments.
          </p>
        </div>

      </div>

      {/* Notice */}
      <div className="pt-8">
        <p className="text-xs text-text-muted flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          System configurations are strictly read-only and governed by backend administration rules.
        </p>
      </div>

    </div>
  );
}
