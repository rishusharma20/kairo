import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

const ADMIN_ITEMS = [
  { label: "Overview", href: "/admin", icon: "BarChart3" },
  { label: "Users", href: "/admin/users", icon: "Users" },
  { label: "Payment Requests", href: "/admin/payments", icon: "Crown" },
  { label: "Audit Logs", href: "/admin/audit", icon: "FileText" },
  { label: "Kairo Chat", href: "/admin/chat", icon: "MessageSquare" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // The middleware already enforces session.email === process.env.ADMIN_EMAIL
  // So by the time we render this layout, we are guaranteed to be an authorized admin.

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <Sidebar 
        items={ADMIN_ITEMS} 
        title="KAIRO"
        badge="ADMIN"
        user={{
          name: "System Admin",
          email: session.email,
          plan: "CONTROL CENTER",
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        {/* Mobile Topbar Spacer */}
        <div className="w-full h-16 shrink-0 lg:hidden flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
           <span className="text-text-primary font-medium tracking-[0.15em] text-sm">KAIRO ADMIN</span>
           <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-bold tracking-wider">
             ROOT
           </span>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
