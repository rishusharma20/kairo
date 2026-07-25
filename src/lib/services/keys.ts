import { prisma } from "@/lib/db";

export class NoHealthyKeyError extends Error {
  constructor(message = "No healthy Gemini key available.") {
    super(message);
    this.name = "NoHealthyKeyError";
  }
}

export async function assignKeys(userId: string, count: number, reason: string) {
  if (count <= 0) return [];

  return await prisma.$transaction(async (tx) => {
    // Lock/find available keys
    const availableKeys = await tx.geminiKey.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { priority: "desc" },
      take: count,
    });

    if (availableKeys.length < count) {
      throw new Error("NOT_ENOUGH_AVAILABLE_KEYS");
    }

    const assignedKeys = [];

    for (const key of availableKeys) {
      const updatedKey = await tx.geminiKey.update({
        where: { id: key.id },
        data: {
          status: "ASSIGNED",
          assigned_user_id: userId,
        },
      });

      await tx.userKeyAssignment.create({
        data: {
          user_id: userId,
          gemini_key_id: updatedKey.id,
          release_reason: reason,
        },
      });

      assignedKeys.push(updatedKey);
    }

    return assignedKeys;
  });
}

export async function releaseKeys(userId: string, count: number | "ALL", reason: string) {
  return await prisma.$transaction(async (tx) => {
    const assignedKeys = await tx.geminiKey.findMany({
      where: { assigned_user_id: userId },
      orderBy: { created_at: "desc" }, // Release newest keys first
    });

    const releaseCount = count === "ALL" ? assignedKeys.length : Math.min(count, assignedKeys.length);
    if (releaseCount === 0) return [];

    const keysToRelease = assignedKeys.slice(0, releaseCount);
    const releasedKeys = [];

    for (const key of keysToRelease) {
      const updatedKey = await tx.geminiKey.update({
        where: { id: key.id },
        data: {
          status: "AVAILABLE",
          assigned_user_id: null,
          cooldown_until: null,
          failure_count: 0,
        },
      });

      // Update the active assignment log to show released_at
      // Note: We don't have an active tracker, we just insert a new log for the release event, 
      // or we can update the original assignment. Since the schema has release_reason, we can log a release event.
      // Wait, the Phase 1 schema has: UserKeyAssignment { assigned_at, released_at, release_reason }.
      // To strictly adhere, we update the existing record where released_at is null.
      
      const activeAssignment = await tx.userKeyAssignment.findFirst({
        where: {
          user_id: userId,
          gemini_key_id: key.id,
          released_at: null
        },
        orderBy: { assigned_at: 'desc' }
      });

      if (activeAssignment) {
        await tx.userKeyAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            released_at: new Date(),
            release_reason: reason
          }
        });
      }

      releasedKeys.push(updatedKey);
    }

    return releasedKeys;
  });
}

export async function getHealthyKeyForUser(userId: string) {
  // Round Robin Algorithm: Order by last_used_at ASC NULLS FIRST
  const keys = await prisma.geminiKey.findMany({
    where: {
      assigned_user_id: userId,
      status: "ASSIGNED", // Must be ASSIGNED (Not COOLDOWN or DISABLED)
      OR: [
        { cooldown_until: null },
        { cooldown_until: { lt: new Date() } }
      ]
    },
    // We sort by last_used_at asc. Keys never used (null) will typically come first, then oldest used.
  });

  if (keys.length === 0) {
    throw new NoHealthyKeyError();
  }

  // To simulate NULLS FIRST which Prisma doesn't natively support across all DBs smoothly,
  // we can sort manually in memory since a user only ever has 1 to 3 keys.
  keys.sort((a, b) => {
    if (!a.last_used_at && !b.last_used_at) return 0;
    if (!a.last_used_at) return -1;
    if (!b.last_used_at) return 1;
    return a.last_used_at.getTime() - b.last_used_at.getTime();
  });

  const selectedKey = keys[0];

  // Update last_used_at for the selected key to rotate it to the back of the queue
  await prisma.geminiKey.update({
    where: { id: selectedKey.id },
    data: { last_used_at: new Date() }
  });

  return selectedKey;
}

export async function blockUser(userId: string) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { status: "BLOCKED" }
    });
    // Trigger release all outside tx since releaseKeys starts its own tx, but we can just use the global function
    // Wait, nested transactions in prisma cause issues. Better to call the standalone release function.
    return user;
  }).then(async (user) => {
    await releaseKeys(userId, "ALL", "USER_BLOCKED");
    return user;
  });
}

export async function deleteUser(userId: string) {
  // SQLite and Prisma might cascade, but let's release the keys first to be safe and adhere to rules
  await releaseKeys(userId, "ALL", "USER_DELETED");
  
  return await prisma.user.update({
    where: { id: userId },
    data: { status: "DELETED" }
  });
}

export async function markKeyCooldown(keyId: string) {
  // 5 minute cooldown
  const cooldownEnd = new Date(Date.now() + 5 * 60 * 1000);
  
  return await prisma.geminiKey.update({
    where: { id: keyId },
    data: {
      status: "COOLDOWN",
      failure_count: { increment: 1 },
      cooldown_until: cooldownEnd
    }
  });
}
