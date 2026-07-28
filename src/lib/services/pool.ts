import { prisma } from "@/lib/db";
import type { GeminiKey } from "@/lib/generated/prisma/client/client";

/**
 * Retrieves globally eligible Gemini credentials from the shared pool.
 * Does not decrypt credentials.
 * 
 * Eligible keys:
 * - Status is AVAILABLE, ACTIVE, or ASSIGNED
 * - Or status is COOLDOWN and cooldown has expired
 * 
 * Disabled keys and active cooldown keys are excluded.
 */
export function isCredentialEligible(key: { status: string; cooldown_until: Date | null }, now: Date = new Date()): boolean {
  if (key.status === "DISABLED") return false;
  if (key.status === "COOLDOWN") {
    return key.cooldown_until !== null && key.cooldown_until < now;
  }
  return ["AVAILABLE", "ACTIVE", "ASSIGNED"].includes(key.status);
}

export async function getHealthyCredentials(): Promise<GeminiKey[]> {
  const now = new Date();
  
  return await prisma.geminiKey.findMany({
    where: {
      OR: [
        { status: { in: ["AVAILABLE", "ACTIVE", "ASSIGNED"] } },
        {
          status: "COOLDOWN",
          cooldown_until: { lt: now }
        }
      ],
      status: { not: "DISABLED" } // Extra safety
    },
    orderBy: [
      { priority: "desc" },
      { last_used_at: "asc" } // Nulls first is not perfectly supported in Prisma orderBy without custom tricks, but this is fine for phase 1.
    ]
  });
}

/**
 * Retrieves globally eligible Gemini credentials for a specific project.
 */
export async function getHealthyCredentialsForProject(projectId: string): Promise<GeminiKey[]> {
  const now = new Date();
  
  return await prisma.geminiKey.findMany({
    where: {
      project_id: projectId,
      OR: [
        { status: { in: ["AVAILABLE", "ACTIVE", "ASSIGNED"] } },
        {
          status: "COOLDOWN",
          cooldown_until: { lt: now }
        }
      ],
      status: { not: "DISABLED" }
    },
    orderBy: [
      { priority: "desc" },
      { last_used_at: "asc" }
    ]
  });
}

export async function markKeyUsed(keyId: string) {
  await prisma.geminiKey.update({
    where: { id: keyId },
    data: { last_used_at: new Date() }
  });
}

export async function markKeyCooldown(keyId: string, minutes: number) {
  const cooldownUntil = new Date();
  cooldownUntil.setMinutes(cooldownUntil.getMinutes() + minutes);

  await prisma.geminiKey.update({
    where: { id: keyId },
    data: {
      status: "COOLDOWN",
      cooldown_until: cooldownUntil,
      failure_count: { increment: 1 }
    }
  });
}

export async function markKeyDisabled(keyId: string) {
  await prisma.geminiKey.update({
    where: { id: keyId },
    data: { status: "DISABLED" }
  });
}
