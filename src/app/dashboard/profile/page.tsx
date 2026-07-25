import { getSession } from "@/lib/auth";
import { getCachedUser } from "@/lib/services/user";
import { redirect } from "next/navigation";
import { User, Mail, Shield, Calendar, CreditCard } from "lucide-react";

export default async function ProfileDashboard() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const user = await getCachedUser(session.userId);

  if (!user) {
    redirect("/auth/login");
  }

  // Format date correctly
  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Profile Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)]">
        <h1 className="heading-md">Profile</h1>
        <p className="text-text-muted">Manage your personal account information.</p>
      </section>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Full Name
          </label>
          <div className="w-full p-4 rounded-xl glass border border-[var(--border)] text-text-primary bg-[var(--surface)]/50 break-words">
            {user.full_name}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Email Address
          </label>
          <div className="w-full p-4 rounded-xl glass border border-[var(--border)] text-text-primary bg-[var(--surface)]/50 break-all">
            {user.email}
          </div>
        </div>

        {/* Account Status */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Account Status
          </label>
          <div className="w-full p-4 rounded-xl glass border border-[var(--border)] bg-[var(--surface)]/50 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-success shadow-[0_0_10px_rgba(0,255,148,0.5)]' : 'bg-warning shadow-[0_0_10px_rgba(255,184,0,0.5)]'}`} />
            <span className="font-medium">{user.status}</span>
          </div>
        </div>

        {/* Current Plan */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            Current Plan
          </label>
          <div className="w-full p-4 rounded-xl glass border border-[var(--border)] bg-[var(--surface)]/50">
            <span className={user.plan === "PREMIUM" ? "gradient-text-gold font-bold" : "text-text-primary font-bold"}>
              {user.plan}
            </span>
          </div>
        </div>

        {/* Joined Date */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Account Created
          </label>
          <div className="w-full p-4 rounded-xl glass border border-[var(--border)] bg-[var(--surface)]/50 text-text-primary">
            Joined {joinedDate}
          </div>
        </div>

      </div>

      {/* Read-Only Notice */}
      <div className="pt-8">
        <p className="text-xs text-text-muted flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          For security purposes, personal details are currently read-only. Contact support to modify your registered email.
        </p>
      </div>

    </div>
  );
}
