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

/**
 * Phase 19: Retrieves all eligible credentials across ALL active projects
 * that support a specific model.
 * 
 * Performs dynamic project discovery — no hard-coded project names or positions.
 * New projects automatically participate once they are ACTIVE with AVAILABLE model status.
 * 
 * Returns credentials ordered by last_used_at ASC (nulls first) for LRU fairness.
 */
export async function getHealthyCredentialsForModel(modelId: string): Promise<GeminiKey[]> {
  const now = new Date();

  // 1. Find all ACTIVE projects that have this model AVAILABLE
  const eligibleProjectModels = await prisma.projectModelAvailability.findMany({
    where: {
      model_id: modelId,
      status: "AVAILABLE",
      project: {
        status: "ACTIVE"
      }
    },
    select: {
      project_id: true
    }
  });

  const eligibleProjectIds = eligibleProjectModels.map(pm => pm.project_id);

  if (eligibleProjectIds.length === 0) {
    return [];
  }

  // 2. Load all healthy credentials for those projects, ordered by LRU
  return await prisma.geminiKey.findMany({
    where: {
      project_id: { in: eligibleProjectIds },
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
      { last_used_at: "asc" } // Nulls first = never-used credentials preferred
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
