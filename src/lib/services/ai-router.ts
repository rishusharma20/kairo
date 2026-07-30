import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHealthyCredentialsForModel, markKeyUsed, markKeyCooldown, markKeyDisabled } from "@/lib/services/pool";
import { decryptKey } from "@/lib/services/encryption";
import { buildPrompt, buildExtensionInferencePrompt, QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { ROUTER_CONFIG } from "@/lib/services/ai-router.config";
import type { TaskCategory } from "@/lib/services/models";
import { getEnabledModels } from "@/lib/services/models";
import { prisma } from "@/lib/db";
import { Prisma, type GeminiKey } from "@/lib/generated/prisma/client/client";
import { randomUUID } from "crypto";
import { logSystemEvent } from "@/lib/services/audit";

// For telemetry
export interface RouterTelemetry {
  requestId: string;
  projectId: string | null;
  credentialId: string | null;
  modelId: string | null;
  taskType: TaskCategory;
  attemptNumber: number;
  latencyMs: number;
  result: "SUCCESS" | "FAILURE";
  failureCategory?: string;
}

/**
 * Phase 19: Model-first routing with cross-project credential fairness.
 *
 * Outer loop: models in global priority order (1→5).
 * Inner loop: eligible credentials across ALL active projects, sorted by LRU.
 *
 * Credential rotation uses database-persisted `last_used_at` for serverless-safe
 * fair selection. Two concurrent serverless instances may select the same credential;
 * this is safe — the next successful `markKeyUsed` updates `last_used_at` and
 * subsequent requests will naturally rotate to the next LRU credential.
 *
 * Concurrency behavior: approximate fairness without database locks.
 * Reliability > perfect rotation.
 */
export async function executeSharedAiRoute(
  taskType: TaskCategory,
  feature: QueryFeature,
  query: string,
  format?: ResponseFormat,
  context?: string,
  screenshot?: string,
  requestId: string = randomUUID(),
  startTime: number = Date.now()
): Promise<{ text: string; telemetry: RouterTelemetry[] }> {
  const trace = (stage: string, extra = "") => {
    console.log(`[KAIRO_TRACE] requestId=${requestId} stage=${stage} elapsedMs=${Date.now() - startTime} ${extra}`.trim());
  };
  try {
    trace("ROUTER_ENTER");
    const isEnvKeyPresent = !!process.env.GEMINI_ENCRYPTION_KEY;
    trace("GEMINI_ENCRYPTION_KEY_PRESENT", isEnvKeyPresent.toString());

  const promptText = format === undefined
    ? buildExtensionInferencePrompt({ feature, query, context })
    : buildPrompt({ feature, query, format, context });

  let prompt: any = promptText;
  if (screenshot) {
    const match = screenshot.match(/^data:(image\/(jpeg|png|webp));base64,/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64Data = screenshot.replace(/^data:image\/(jpeg|png|webp);base64,/, "");
    prompt = [
      promptText,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ];
  }

  const telemetryLog: RouterTelemetry[] = [];

  let totalAttempts = 0;
  const attemptedRoutes = new Set<string>(); // Track "credentialId:modelId" to prevent duplicates
  const excludedProjects = new Set<string>();
  const excludedCredentials = new Set<string>();

  // Phase 19: Model-first outer loop — global deterministic priority
  const models = getEnabledModels(); // Already sorted by priority ASC
  trace("MODELS_LOADED", `count=${models.length}`);

  for (const modelConfig of models) {
    if (totalAttempts >= ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS) break;

    trace("MODEL_PRIORITY_START", `modelId=${modelConfig.id} priority=${modelConfig.priority}`);

    // Phase 19: Dynamic route building — query ALL active projects for this model
    let modelCredentials;
    try {
      modelCredentials = await getHealthyCredentialsForModel(modelConfig.id);
    } catch (poolErr: unknown) {
      if (poolErr instanceof Prisma.PrismaClientKnownRequestError) {
        trace("POOL_QUERY_FAILURE", `errorName=${poolErr.name} prismaCode=${poolErr.code}`);
      } else {
        const errorName = poolErr instanceof Error ? poolErr.name : "UnknownError";
        trace("POOL_QUERY_FAILURE", `errorName=${errorName}`);
      }
      throw poolErr;
    }

    // Phase 19: Project-interleaved LRU sort for fairness
    // DB returns credentials ordered by last_used_at ASC (nulls first).
    // Interleave across projects so no single project dominates the attempt sequence.
    const sortedRoutes = interleaveByProject(modelCredentials, excludedProjects, excludedCredentials);

    trace("ROUTES_BUILT", `modelId=${modelConfig.id} eligibleRoutes=${sortedRoutes.length}`);

    let modelAttempts = 0;

    for (const credential of sortedRoutes) {
      if (totalAttempts >= ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS) break;
      if (modelAttempts >= ROUTER_CONFIG.MAX_ATTEMPTS_PER_MODEL) break;

      const routeKey = `${credential.id}:${modelConfig.id}`;
      if (attemptedRoutes.has(routeKey)) continue; // No duplicate route attempts
      if (excludedProjects.has(credential.project_id!)) continue;
      if (excludedCredentials.has(credential.id)) continue;
      attemptedRoutes.add(routeKey);

      const projectId = credential.project_id!;
      trace("ROUTE_SELECTED", `projectId=${projectId} credentialId=${credential.id} modelId=${modelConfig.id}`);

      // Decrypt
      let decryptedKey: string;
      let genAI: GoogleGenerativeAI;
      trace("DECRYPT_START");
      try {
        decryptedKey = decryptKey(credential.encrypted_api_key);
        trace("DECRYPT_SUCCESS");
        genAI = new GoogleGenerativeAI(decryptedKey);
      } catch (_err: unknown) {
        trace("DECRYPT_FAILURE");
        totalAttempts++;
        modelAttempts++;
        excludedCredentials.add(credential.id);
        telemetryLog.push({
          requestId,
          projectId,
          credentialId: credential.id,
          modelId: null,
          taskType,
          attemptNumber: totalAttempts,
          latencyMs: 0,
          result: "FAILURE",
          failureCategory: "DECRYPTION_ERROR"
        });
        continue;
      }

      // Provider call
      totalAttempts++;
      modelAttempts++;
      const attemptStart = Date.now();

      try {
        const model = genAI.getGenerativeModel({ model: modelConfig.id });

        // Timeout wrapper
        trace("PROVIDER_START");
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("PROVIDER_TIMEOUT")), ROUTER_CONFIG.PROVIDER_TIMEOUT_MS)
          )
        ]);

        const response = await result.response;
        const text = response.text();
        trace("PROVIDER_RESPONSE", "status=200");

        // SUCCESS — update LRU timestamp for fair future rotation
        await markKeyUsed(credential.id);

        telemetryLog.push({
          requestId,
          projectId,
          credentialId: credential.id,
          modelId: modelConfig.id,
          taskType,
          attemptNumber: totalAttempts,
          latencyMs: Date.now() - attemptStart,
          result: "SUCCESS"
        });

        if (telemetryLog.length > 0) {
          try {
            await logSystemEvent("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
          } catch (telemetryErr) {
            console.error("[Router Telemetry Error]", telemetryErr);
          }
        }
        trace("ROUTER_SUCCESS");
        return { text, telemetry: telemetryLog };

      } catch (err: unknown) {
        const apiError = err as { status?: number; message?: string };
        trace("PROVIDER_RESPONSE", `status=${apiError.status || "unknown"}`);
        const latencyMs = Date.now() - attemptStart;
        let failureCategory = "UNKNOWN_ERROR";

        const isTimeout = err instanceof Error && err.message === "PROVIDER_TIMEOUT";

        // 400: Bad Request
        if (apiError.status === 400) {
          failureCategory = "BAD_REQUEST";
          const errMsg = apiError.message?.toLowerCase() || "";
          const isModelSpecific = errMsg.includes("model") || errMsg.includes("supported") || errMsg.includes("version") || errMsg.includes("invalid argument");

          if (isModelSpecific) {
            excludedCredentials.add(credential.id); // Try a different route
          } else {
            // Truly malformed request, fail immediately
            telemetryLog.push({ requestId, projectId, credentialId: credential.id, modelId: modelConfig.id, taskType, attemptNumber: totalAttempts, latencyMs, result: "FAILURE", failureCategory });
            try {
              await logSystemEvent("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
            } catch (telemetryErr) {
              console.error("[Router Telemetry Error]", telemetryErr);
            }
            throw new Error(`AI Router Error: 400 Bad Request. ${apiError.message}`);
          }
        }

        // 401: Authentication failure (strictly disable credential)
        else if (apiError.status === 401) {
          failureCategory = "AUTH_ERROR";
          await markKeyDisabled(credential.id);
          excludedCredentials.add(credential.id);
        }
        // 403: Permission/Quota error (strictly project exclusion, do not disable)
        else if (apiError.status === 403) {
          failureCategory = "PERMISSION_DENIED";
          excludedProjects.add(projectId);
        }
        // 404: Model not found for this project
        else if (apiError.status === 404) {
          failureCategory = "MODEL_NOT_FOUND";
          await prisma.projectModelAvailability.update({
            where: { project_id_model_id: { project_id: projectId, model_id: modelConfig.id } },
            data: { status: "UNAVAILABLE" }
          });
        }
        // 429: Rate limit — project-scoped exclusion and temporary credential cooldown
        else if (apiError.status === 429) {
          failureCategory = "RATE_LIMIT";
          excludedProjects.add(projectId);
          await markKeyCooldown(credential.id, ROUTER_CONFIG.COOLDOWN_MINUTES);
          excludedCredentials.add(credential.id);
        }
        // Timeout / 5xx: Temporary failure — do NOT increment failure count, do NOT cooldown, do NOT disable
        else if (isTimeout || (apiError.status ?? 0) >= 500 || apiError.message?.includes('fetch failed')) {
          failureCategory = isTimeout ? "TIMEOUT" : "TEMPORARY_BACKEND";
          // No action needed: attemptedRoutes already prevents retrying this exact route in this request
        }

        telemetryLog.push({
          requestId,
          projectId,
          credentialId: credential.id,
          modelId: modelConfig.id,
          taskType,
          attemptNumber: totalAttempts,
          latencyMs,
          result: "FAILURE",
          failureCategory
        });
      }
    }
  }

  if (telemetryLog.length > 0) {
    try {
      await logSystemEvent("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
    } catch (telemetryErr) {
      console.error("[Router Telemetry Error]", telemetryErr);
    }
  }
  throw new Error("AI_UNAVAILABLE: All router attempts exhausted or no available routes.");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("AI_UNAVAILABLE")) {
      trace("ROUTER_EXHAUSTED");
      throw err;
    }
    if (err instanceof Error && err.message.includes("400 Bad Request")) {
      trace("ROUTER_FATAL", "BadRequestError");
      throw err;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      trace("ROUTER_FATAL", `PrismaClientKnownRequestError code=${err.code}`);
      throw err;
    }
    const safeErrorName = err instanceof Error ? err.name || "UnknownError" : "UnknownError";
    trace("ROUTER_FATAL", safeErrorName);
    throw err;
  }
}

/**
 * Phase 19: Interleave credentials across projects for fair distribution.
 *
 * Given credentials already sorted by last_used_at ASC (nulls first) from DB,
 * interleave them so we pick one credential from each project in round-robin
 * before picking a second from any project.
 *
 * This prevents a single project with many credentials from dominating the
 * attempt sequence while still respecting LRU within each project.
 */
function interleaveByProject(
  credentials: GeminiKey[],
  excludedProjects: Set<string>,
  excludedCredentials: Set<string>
): typeof credentials {
  // Group by project, preserving LRU order within each group
  const byProject = new Map<string, typeof credentials>();
  for (const cred of credentials) {
    if (!cred.project_id) continue;
    if (excludedProjects.has(cred.project_id)) continue;
    if (excludedCredentials.has(cred.id)) continue;
    if (!byProject.has(cred.project_id)) byProject.set(cred.project_id, []);
    byProject.get(cred.project_id)!.push(cred);
  }

  // Order projects by their first (LRU) credential's last_used_at
  // Projects with never-used credentials come first
  // Stable tie-breaker: project ID (alphabetical) when timestamps are equal
  const projectOrder = [...byProject.entries()].sort((a, b) => {
    const aFirst = a[1][0] as { last_used_at?: Date | null };
    const bFirst = b[1][0] as { last_used_at?: Date | null };
    const aNull = aFirst.last_used_at === null || aFirst.last_used_at === undefined;
    const bNull = bFirst.last_used_at === null || bFirst.last_used_at === undefined;
    if (aNull && bNull) return a[0].localeCompare(b[0]); // Stable: sort by project ID
    if (aNull) return -1; // Never-used projects first
    if (bNull) return 1;
    const diff = new Date(aFirst.last_used_at!).getTime() - new Date(bFirst.last_used_at!).getTime();
    if (diff !== 0) return diff;
    return a[0].localeCompare(b[0]); // Stable tie-breaker for equal timestamps
  });

  // Round-robin interleave: take one from each project in order, repeat
  const result: typeof credentials = [];
  const iterators = projectOrder.map(([, creds]) => ({ creds, index: 0 }));
  let added = true;
  while (added) {
    added = false;
    for (const it of iterators) {
      if (it.index < it.creds.length) {
        result.push(it.creds[it.index]);
        it.index++;
        added = true;
      }
    }
  }

  return result;
}
