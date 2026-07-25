import { prisma } from "@/lib/db";
import { assignKeys, releaseKeys } from "@/lib/services/keys";

export async function upgradeToPremium(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PREMIUM",
      daily_limit: 3000,
    },
  });

  // Assign 2 additional keys per Phase 4 logic
  await assignKeys(userId, 2, "PREMIUM_UPGRADE");

  return user;
}

export async function downgradeToFree(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "FREE",
      daily_limit: 1,
    },
  });

  // Release 2 keys per Phase 4 logic
  await releaseKeys(userId, 2, "PREMIUM_DOWNGRADE");

  return user;
}
