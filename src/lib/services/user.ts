import { cache } from "react";
import { prisma } from "@/lib/db";
import { getTodayUTC } from "@/lib/services/usage";

import { enforcePlanExpiration } from "@/lib/services/plan";

/**
 * Deduplicates database queries across Next.js Server Components.
 * Also lazily enforces plan expiration.
 */
export const getCachedUser = cache(async (userId: string) => {
  return await enforcePlanExpiration(userId);
});

/**
 * Deduplicates daily usage queries across Next.js Server Components.
 */
export const getCachedUsage = cache(async (userId: string) => {
  const today = getTodayUTC();
  return await prisma.dailyUsage.findUnique({
    where: {
      user_id_usage_date: {
        user_id: userId,
        usage_date: today,
      },
    },
  });
});
