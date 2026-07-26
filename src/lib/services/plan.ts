import { prisma } from "@/lib/db";
import { assignKeys, releaseKeys } from "@/lib/services/keys";

export const PLANS = [
  "FREE",
  "PREMIUM_7_DAYS",
  "PREMIUM_30_DAYS"
] as const;

export type PlanTier = typeof PLANS[number];

export const PLAN_CONFIGS: Record<PlanTier, { dailyLimit: number; keysRequired: number }> = {
  FREE: { dailyLimit: 1, keysRequired: 1 },
  PREMIUM_7_DAYS: { dailyLimit: 3000, keysRequired: 3 },
  PREMIUM_30_DAYS: { dailyLimit: 3000, keysRequired: 3 },
};

/**
 * Change a user's subscription tier, adjusting limits and API keys automatically.
 */
export async function changeUserTier(userId: string, targetPlan: PlanTier) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const currentPlan = (user.plan as PlanTier) || "FREE";
  const currentConfig = PLAN_CONFIGS[currentPlan] || PLAN_CONFIGS.FREE;
  const targetConfig = PLAN_CONFIGS[targetPlan];

  if (!targetConfig) throw new Error(`Invalid plan: ${targetPlan}`);

  // Calculate Expiration based entirely on the Tier name
  let planExpiresAt: Date | null = null;
  if (targetPlan === "PREMIUM_7_DAYS") {
    planExpiresAt = new Date();
    planExpiresAt.setDate(planExpiresAt.getDate() + 7);
  } else if (targetPlan === "PREMIUM_30_DAYS") {
    planExpiresAt = new Date();
    planExpiresAt.setDate(planExpiresAt.getDate() + 30);
  }

  // Determine Key Delta
  const keyDelta = targetConfig.keysRequired - currentConfig.keysRequired;

  // Perform Update
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { plan: targetPlan, daily_limit: targetConfig.dailyLimit, plan_expires_at: planExpiresAt }
  });

  // Adjust Keys
  if (keyDelta > 0) {
    await assignKeys(userId, keyDelta, "PLAN_UPGRADE");
  } else if (keyDelta < 0) {
    await releaseKeys(userId, Math.abs(keyDelta), "PLAN_DOWNGRADE");
  }

  return updatedUser;
}

/**
 * Check if a user's plan has expired and downgrade them to FREE if so.
 * This should be called lazily during session verification.
 */
export async function enforcePlanExpiration(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.plan === "FREE") return user;

  // Check if expiration exists and has passed
  if (user.plan_expires_at && user.plan_expires_at.getTime() < Date.now()) {
    console.log(`[Expiration Engine] User ${userId} plan ${user.plan} expired. Downgrading to FREE.`);
    return await changeUserTier(userId, "FREE");
  }

  return user;
}
