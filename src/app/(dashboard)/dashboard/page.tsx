import { DashboardClient } from "./dashboard-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  // Fetch User & Subscription
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      subscription: true
    }
  });

  if (!user) {
    redirect("/auth/login");
  }

  const name = user.name || "USER";
  const planId = user.subscription?.planId || "FREE";
  const requestsToday = user.subscription?.queriesUsedToday || 0;

  // Fetch Recent Request Logs & Calculate Average Latency
  const logs = await prisma.requestLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 5
  });

  const aggregate = await prisma.requestLog.aggregate({
    where: { userId: user.id },
    _avg: { latencyMs: true }
  });

  const avgLatency = Math.round(aggregate._avg.latencyMs || 0);

  const recentRequests = logs.map(log => ({
    type: log.queryType,
    latency: log.latencyMs,
    time: log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <DashboardClient 
      name={name}
      requestsToday={requestsToday}
      planId={planId}
      avgLatency={avgLatency}
      recentRequests={recentRequests}
    />
  );
}
