import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { getCachedUser } from "@/lib/services/user";

const DASHBOARD_ITEMS = [
  { label: "Home", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Kairo Chat", href: "/dashboard/chat", icon: "MessageSquare" },
  { label: "Profile", href: "/dashboard/profile", icon: "User" },
  { label: "Billing", href: "/dashboard/billing", icon: "Crown" },
  { label: "Get Extension", href: "#get-extension", icon: "Puzzle" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Double check DB status in case session is stale
  const dbUser = await getCachedUser(session.userId);

  if (!dbUser || dbUser.status === "DELETED") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <Sidebar 
        items={DASHBOARD_ITEMS} 
        user={{
          name: dbUser.full_name,
          email: dbUser.email,
          plan: dbUser.plan,
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        {/* Simple topbar spacer or global actions could go here */}
        <div className="w-full h-16 shrink-0 lg:hidden flex items-center px-4 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
           <span className="text-text-primary font-medium tracking-[0.15em] text-sm">KAIRO</span>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
