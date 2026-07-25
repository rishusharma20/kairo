import { cache } from "react";
import { prisma } from "@/lib/db";
import { getTodayUTC } from "@/lib/services/usage";

/**
 * Deduplicates database queries across Next.js Server Components.
 * If layout.tsx and page.tsx both call this function in the same render pass,
 * the database is only hit once.
 */
export const getCachedUser = cache(async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
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
