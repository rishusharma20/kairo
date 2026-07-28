import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { prisma } from "@/lib/db";
import { MODEL_REGISTRY } from "@/lib/services/models";
import { ROUTER_CONFIG } from "@/lib/services/ai-router.config";

async function handler(request: Request) {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [projects, keys, projectModels, logs] = await Promise.all([
      prisma.providerProject.findMany(),
      prisma.geminiKey.findMany({
        select: {
          id: true,
          status: true,
          project_id: true,
          priority: true,
          last_used_at: true,
          failure_count: true,
          cooldown_until: true,
          created_at: true,
        },
      }),
      prisma.projectModelAvailability.findMany(),
      prisma.auditLog.findMany({
        where: {
          action: "ROUTER_TELEMETRY",
          created_at: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    // Health logic
    const healthyProjectsCount = projects.filter((p) => p.status === "ACTIVE").length;
    let healthyKeysCount = 0;
    let cooldownKeysCount = 0;
    let disabledKeysCount = 0;

    for (const key of keys) {
      if (key.status === "DISABLED") {
        disabledKeysCount++;
      } else if (key.cooldown_until && key.cooldown_until > now) {
        cooldownKeysCount++;
      } else if (key.status === "AVAILABLE" || key.status === "ASSIGNED") {
        healthyKeysCount++;
      }
    }

    let availableRoutes = 0;
    for (const key of keys) {
      if (
        (key.status !== "AVAILABLE" && key.status !== "ASSIGNED") ||
        (key.cooldown_until && key.cooldown_until > now) ||
        !key.project_id
      ) {
        continue;
      }
      const p = projects.find((p) => p.id === key.project_id);
      if (!p || p.status !== "ACTIVE") continue;

      const pModels = projectModels.filter(
        (pm) => pm.project_id === key.project_id && pm.status === "AVAILABLE"
      );
      availableRoutes += pModels.length;
    }

    let health = "UNAVAILABLE";
    if (availableRoutes > 0) {
      health =
        healthyProjectsCount === projects.length && disabledKeysCount === 0 && cooldownKeysCount === 0
          ? "HEALTHY"
          : "DEGRADED";
    }

    // Warnings
    const warnings: string[] = [];
    if (availableRoutes === 0) warnings.push("NO AVAILABLE AI ROUTES");
    if (healthyProjectsCount === 1) warnings.push("ONLY ONE HEALTHY PROJECT REMAINING");
    if (cooldownKeysCount > 0) warnings.push(`${cooldownKeysCount} CREDENTIALS IN COOLDOWN`);
    if (disabledKeysCount > 0) warnings.push(`${disabledKeysCount} CREDENTIALS DISABLED`);

    // Model Matrix
    const modelMatrix: Record<string, Record<string, string>> = {};
    for (const model of MODEL_REGISTRY) {
      modelMatrix[model.id] = {};
      for (const p of projects) {
        const pModel = projectModels.find((pm) => pm.project_id === p.id && pm.model_id === model.id);
        modelMatrix[model.id][p.id] = pModel ? pModel.status : "UNKNOWN";
      }
      // Check if model unavailable everywhere
      let isAvailableAnywhere = false;
      for (const p of projects) {
        if (modelMatrix[model.id][p.id] === "AVAILABLE") isAvailableAnywhere = true;
      }
      if (!isAvailableAnywhere) {
        warnings.push(`MODEL ${model.id} UNAVAILABLE ON ALL PROJECTS`);
      }
    }

    // Metrics & Activity
    const metrics = {
      totalRequests: logs.length,
      successfulRequests: 0,
      failedRequests: 0,
      providerAttempts: 0,
      failovers: 0,
      averageLatency: 0,
      modelDistribution: {} as Record<string, number>,
      projectDistribution: {} as Record<string, number>,
      failureCategories: {} as Record<string, number>,
    };

    const recentActivity = [];
    let totalLatency = 0;

    for (const log of logs) {
      try {
        const meta = JSON.parse(log.metadata || "{}");
        const telemetryArray = meta.telemetry || [];
        if (!Array.isArray(telemetryArray) || telemetryArray.length === 0) continue;

        metrics.providerAttempts += telemetryArray.length;
        metrics.failovers += telemetryArray.length - 1;

        const lastAttempt = telemetryArray[telemetryArray.length - 1];
        if (lastAttempt.result === "SUCCESS") {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }

        for (let i = 0; i < telemetryArray.length; i++) {
          const attempt = telemetryArray[i];
          totalLatency += attempt.latencyMs || 0;

          if (attempt.modelId) {
            metrics.modelDistribution[attempt.modelId] = (metrics.modelDistribution[attempt.modelId] || 0) + 1;
          }
          if (attempt.projectId) {
            metrics.projectDistribution[attempt.projectId] = (metrics.projectDistribution[attempt.projectId] || 0) + 1;
          }
          if (attempt.result === "FAILURE" && attempt.failureCategory) {
            metrics.failureCategories[attempt.failureCategory] = (metrics.failureCategories[attempt.failureCategory] || 0) + 1;
          }

          // Build recent activity
          if (recentActivity.length < 50) {
            recentActivity.push({
              timestamp: log.created_at,
              requestId: attempt.requestId,
              taskType: attempt.taskType,
              projectId: attempt.projectId,
              credentialId: attempt.credentialId,
              modelId: attempt.modelId,
              attemptNumber: attempt.attemptNumber,
              latencyMs: attempt.latencyMs,
              result: attempt.result === "SUCCESS" 
                  ? "SUCCESS" 
                  : (i < telemetryArray.length - 1 ? (attempt.failureCategory === 'MODEL_NOT_FOUND' ? "MODEL_FAILOVER" : "FAILOVER") : "FAILED"),
              failureCategory: attempt.failureCategory
            });
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (metrics.providerAttempts > 0) {
      metrics.averageLatency = Math.round(totalLatency / metrics.providerAttempts);
    }

    return NextResponse.json({
      success: true,
      data: {
        health,
        projects: projects.map((p) => {
          const pKeys = keys.filter((k) => k.project_id === p.id);
          const pModels = projectModels.filter((pm) => pm.project_id === p.id);
          return {
            ...p,
            credentialCount: pKeys.length,
            healthyCredentials: pKeys.filter(
              (k) => (k.status === "AVAILABLE" || k.status === "ASSIGNED") && (!k.cooldown_until || k.cooldown_until <= now)
            ).length,
            cooldownCredentials: pKeys.filter((k) => k.cooldown_until && k.cooldown_until > now).length,
            disabledCredentials: pKeys.filter((k) => k.status === "DISABLED").length,
            availableModels: pModels.filter((pm) => pm.status === "AVAILABLE").length,
            unavailableModels: pModels.filter((pm) => pm.status === "UNAVAILABLE").length,
          };
        }),
        credentials: keys,
        modelMatrix,
        routes: availableRoutes,
        metrics,
        recentActivity: recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50),
        warnings,
      },
    });
  } catch (error: unknown) {
    console.error("Admin AI Infrastructure Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = withAdminValidation(handler);
