import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { assignKeys, releaseKeys } from "@/lib/services/keys";
import { logSystemEventInBackground } from "@/lib/services/audit";
import { upgradeToPremium, downgradeToFree } from "@/lib/services/plan";
import { getTodayUTC } from "@/lib/services/usage";

// --------------------------------------------------------
// USER ACTIONS
// --------------------------------------------------------

export async function blockUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status === "BLOCKED") throw new Error("User is already blocked");

  // Release all assigned keys
  await releaseKeys(userId, 9999, "USER_BLOCKED");

  // Change status
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "BLOCKED" }
  });

  logSystemEventInBackground("USER_BLOCKED", userId, { adminAction: true });
  return updated;
}

export async function unblockUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status !== "BLOCKED") throw new Error("User is not blocked");

  // Change status back
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" }
  });

  // Reassign keys based on plan
  const count = user.plan === "PREMIUM" ? 3 : 1;
  await assignKeys(userId, count, "ADMIN_RELEASE");

  logSystemEventInBackground("USER_UNBLOCKED", userId, { adminAction: true, keysAssigned: count });
  return updated;
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status === "DELETED") throw new Error("User is already deleted");

  // Release all assigned keys
  await releaseKeys(userId, 9999, "USER_DELETED");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "DELETED" }
  });

  logSystemEventInBackground("USER_DELETED", userId, { adminAction: true });
  return updated;
}

export async function upgradeToPremiumAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status === "DELETED") throw new Error("Invalid user state");
  if (user.plan === "PREMIUM") throw new Error("User is already premium");

  const updated = await upgradeToPremium(userId);
  logSystemEventInBackground("PLAN_UPGRADED", userId, { plan: "PREMIUM", adminAction: true });
  return updated;
}

export async function downgradeToFreeAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.status === "DELETED") throw new Error("Invalid user state");
  if (user.plan === "FREE") throw new Error("User is already free");

  const updated = await downgradeToFree(userId);
  logSystemEventInBackground("PLAN_DOWNGRADED", userId, { plan: "FREE", adminAction: true });
  return updated;
}

// --------------------------------------------------------
// READ OPERATIONS
// --------------------------------------------------------

export async function searchUsers(params: {
  email?: string;
  status?: string;
  plan?: string;
  id?: string;
}) {
  const where: Prisma.UserWhereInput = {};
  
  if (params.id) where.id = params.id;
  if (params.email) where.email = { contains: params.email };
  if (params.status) where.status = params.status;
  if (params.plan) where.plan = params.plan;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      full_name: true,
      email: true,
      plan: true,
      status: true,
      daily_limit: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    take: 100
  });

  const today = getTodayUTC();
  
  // Attach daily usage
  const enhanced = await Promise.all(users.map(async (u) => {
    const usage = await prisma.dailyUsage.findUnique({
      where: {
        user_id_usage_date: { user_id: u.id, usage_date: today }
      }
    });
    
    return {
      ...u,
      requests_used: usage ? usage.requests_used : 0
    };
  }));

  return enhanced;
}

export async function getAuditLogs(limit = 100, offset = 0) {
  return await prisma.auditLog.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          full_name: true,
          email: true,
        }
      }
    }
  });
}
