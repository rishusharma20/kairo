import { prisma } from "@/lib/db";

export class DailyLimitExceededError extends Error {
  constructor() {
    super("Daily request limit reached.");
    this.name = "DailyLimitExceededError";
  }
}

export class InvalidUserStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserStateError";
  }
}

// Ensure UTC midnight for accurate cross-timezone daily usage resets
export function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function verifyUsageLimits(userId: string) {
  // 1. Fetch user to verify status and limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new InvalidUserStateError("User not found");
  if (user.status === "BLOCKED") throw new InvalidUserStateError("User is blocked");
  if (user.status === "DELETED") throw new InvalidUserStateError("User is deleted");

  const today = getTodayUTC();

  // 2. Perform atomic upsert for JIT reset check without incrementing
  const usage = await prisma.dailyUsage.upsert({
    where: {
      user_id_usage_date: {
        user_id: userId,
        usage_date: today,
      },
    },
    update: {},
    create: {
      user_id: userId,
      usage_date: today,
      requests_used: 0,
      daily_limit: user.daily_limit,
    }
  });

  if (usage.requests_used >= user.daily_limit) {
    throw new DailyLimitExceededError();
  }

  return true;
}

export async function incrementUsage(userId: string) {
  const today = getTodayUTC();
  
  await prisma.dailyUsage.update({
    where: {
      user_id_usage_date: { user_id: userId, usage_date: today }
    },
    data: { requests_used: { increment: 1 } }
  });
}

import { runInBackground } from "@/lib/services/background";
export function incrementUsageInBackground(userId: string) {
  runInBackground(`incrementUsage-${userId}`, async () => {
    await incrementUsage(userId);
  });
}

export async function getUsageQuota(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, daily_limit: true },
  });

  if (!user) throw new InvalidUserStateError("User not found");

  const today = getTodayUTC();
  const usage = await prisma.dailyUsage.findUnique({
    where: {
      user_id_usage_date: {
        user_id: userId,
        usage_date: today,
      },
    },
  });

  const requests_used = usage ? usage.requests_used : 0;
  
  return {
    plan: user.plan,
    daily_limit: user.daily_limit,
    requests_used,
    remaining: Math.max(0, user.daily_limit - requests_used),
  };
}
