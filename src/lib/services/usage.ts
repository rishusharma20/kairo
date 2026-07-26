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
  const today = getTodayUTC();

  // 1. Fetch user to verify status, limits, and today's usage in ONE query
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      daily_usages: {
        where: { usage_date: today },
      }
    }
  });

  if (!user) throw new InvalidUserStateError("User not found");
  if (user.status === "BLOCKED") throw new InvalidUserStateError("User is blocked");
  if (user.status === "DELETED") throw new InvalidUserStateError("User is deleted");

  const requests_used = user.daily_usages.length > 0 ? user.daily_usages[0].requests_used : 0;

  if (requests_used >= user.daily_limit) {
    throw new DailyLimitExceededError();
  }

  return { daily_limit: user.daily_limit };
}

export async function atomicReserveUsage(userId: string) {
  const today = getTodayUTC();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { daily_limit: true }
  });
  if (!user) throw new InvalidUserStateError("User not found");

  await prisma.dailyUsage.upsert({
    where: {
      user_id_usage_date: { user_id: userId, usage_date: today }
    },
    update: {},
    create: {
      user_id: userId,
      usage_date: today,
      requests_used: 0,
      daily_limit: user.daily_limit
    }
  });

  const updateResult = await prisma.dailyUsage.updateMany({
    where: {
      user_id: userId,
      usage_date: today,
      requests_used: { lt: user.daily_limit }
    },
    data: { requests_used: { increment: 1 } }
  });

  if (updateResult.count === 0) {
    throw new DailyLimitExceededError();
  }
}

export async function refundUsage(userId: string) {
  const today = getTodayUTC();
  await prisma.dailyUsage.updateMany({
    where: {
      user_id: userId,
      usage_date: today,
      requests_used: { gt: 0 }
    },
    data: { requests_used: { decrement: 1 } }
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
