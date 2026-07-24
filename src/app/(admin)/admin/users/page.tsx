import { AdminUsersClient } from "./admin-users-client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const session = await getSession();
  
  // Validate Admin Access (in production check if user is admin)
  if (!session) {
    redirect("/auth/login");
  }

  // Fetch all users with their subscriptions and usage
  const dbUsers = await prisma.user.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" }
  });

  const users = dbUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.subscription?.planId || "FREE",
    status: user.isSuspended ? "Suspended" : "Active" as "Active" | "Suspended",
    requests: user.subscription?.queriesUsedToday || 0,
  }));

  return <AdminUsersClient users={users} />;
}
