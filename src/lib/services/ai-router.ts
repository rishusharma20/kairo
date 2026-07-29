import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHealthyCredentials, markKeyUsed, markKeyCooldown, markKeyDisabled } from "@/lib/services/pool";
import { getAvailableModelsForProject } from "@/lib/services/discovery";
import { decryptKey } from "@/lib/services/encryption";
import { buildPrompt, buildExtensionInferencePrompt, QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { PageContext } from "@/types/extension-context";
import { ROUTER_CONFIG } from "@/lib/services/ai-router.config";
import type { TaskCategory } from "@/lib/services/models";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client/client";
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

export async function executeSharedAiRoute(
  taskType: TaskCategory,
  feature: QueryFeature,
  query: string,
  format: ResponseFormat,
  context?: string | PageContext,
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

  const prompt = typeof context === 'object' && context !== null
    ? buildExtensionInferencePrompt({ feature, query, format, context })
    : buildPrompt({ feature, query, format, context });
  const telemetryLog: RouterTelemetry[] = [];
  
  let totalAttempts = 0;
  let credentialsTried = 0;
  
  trace("POOL_LOAD_START");
  let healthyKeys;
  try {
    healthyKeys = await getHealthyCredentials();
  } catch (poolErr: unknown) {
    if (poolErr instanceof Prisma.PrismaClientKnownRequestError) {
      trace("POOL_QUERY_FAILURE", `errorName=${poolErr.name} prismaCode=${poolErr.code}`);
    } else {
      const errorName = poolErr instanceof Error ? poolErr.name : "UnknownError";
      trace("POOL_QUERY_FAILURE", `errorName=${errorName}`);
    }
    throw poolErr;
  }
  
  // Group keys by project to respect project awareness
  const keysByProject = new Map<string, typeof healthyKeys>();
  for (const key of healthyKeys) {
    if (!key.project_id) continue;
    if (!keysByProject.has(key.project_id)) keysByProject.set(key.project_id, []);
    keysByProject.get(key.project_id)!.push(key);
  }

  // Distribution preserving LRU order:
  const eligibleProjectIds = new Set<string>();
  const orderedProjects: string[] = [];
  for (const key of healthyKeys) {
    if (key.project_id && !eligibleProjectIds.has(key.project_id)) {
      eligibleProjectIds.add(key.project_id);
      orderedProjects.push(key.project_id);
    }
  }

  trace("POOL_LOAD_SUCCESS", `projectCount=${orderedProjects.length} credentialCount=${healthyKeys.length}`);
  const excludedProjects = new Set<string>();

  for (const projectId of orderedProjects) {
    trace("PROJECT_SELECTED", `projectId=${projectId}`);
    if (excludedProjects.has(projectId)) continue;
    
    // Check limits
    if (excludedProjects.size >= ROUTER_CONFIG.MAX_PROJECTS_PER_REQUEST) break;

    const projectKeys = keysByProject.get(projectId) || [];
    
    for (const key of projectKeys) {
      trace("CREDENTIAL_SELECTED", `credentialId=${key.id}`);
      if (credentialsTried >= ROUTER_CONFIG.MAX_CREDENTIALS_PER_REQUEST) {
        break; // Stop completely if credential limit reached
      }

      if (excludedProjects.has(projectId)) {
        break; // If a previous key caused this project to be excluded, skip remaining keys
      }

      trace("MODEL_LOAD_START");
      const availableModels = await getAvailableModelsForProject(projectId, taskType);
      
      // Enforce deterministic global model priority regardless of discovery/database order
      availableModels.sort((a, b) => a.priority - b.priority);
      
      trace("MODEL_LOAD_SUCCESS", `modelCount=${availableModels.length}`);
      if (availableModels.length === 0) {
        // No available models for this project + task, skip to next project
        excludedProjects.add(projectId);
        break; 
      }

      credentialsTried++;
      let modelsTried = 0;
      let credentialIsDead = false;

      let decryptedKey: string;
      let genAI: GoogleGenerativeAI;
      trace("DECRYPT_START");
      try {
        decryptedKey = decryptKey(key.encrypted_api_key);
        trace("DECRYPT_SUCCESS");
        genAI = new GoogleGenerativeAI(decryptedKey);
      } catch (_err: unknown) {
        trace("DECRYPT_FAILURE");
        totalAttempts++;
        telemetryLog.push({
          requestId,
          projectId,
          credentialId: key.id,
          modelId: null,
          taskType,
          attemptNumber: totalAttempts,
          latencyMs: 0,
          result: "FAILURE",
          failureCategory: "DECRYPTION_ERROR"
        });
        continue;
      }

      for (const modelConfig of availableModels) {
        trace("MODEL_SELECTED", `modelId=${modelConfig.id}`);
        if (modelsTried >= ROUTER_CONFIG.MAX_MODELS_PER_CREDENTIAL) break;
        if (totalAttempts >= ROUTER_CONFIG.MAX_TOTAL_ATTEMPTS) break;
        if (credentialIsDead) break;
        if (excludedProjects.has(projectId)) break;

        modelsTried++;
        totalAttempts++;
        const startTime = Date.now();

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

          // SUCCESS
          await markKeyUsed(key.id);
          
          telemetryLog.push({
            requestId,
            projectId,
            credentialId: key.id,
            modelId: modelConfig.id,
            taskType,
            attemptNumber: totalAttempts,
            latencyMs: Date.now() - startTime,
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
          const latencyMs = Date.now() - startTime;
          let failureCategory = "UNKNOWN_ERROR";

          const isTimeout = err instanceof Error && err.message === "PROVIDER_TIMEOUT";
          
          if (apiError.status === 400) {
            failureCategory = "BAD_REQUEST";
            telemetryLog.push({ requestId, projectId, credentialId: key.id, modelId: modelConfig.id, taskType, attemptNumber: totalAttempts, latencyMs, result: "FAILURE", failureCategory });
            try {
              await logSystemEvent("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
            } catch (telemetryErr) {
              console.error("[Router Telemetry Error]", telemetryErr);
            }
            throw new Error(`AI Router Error: 400 Bad Request. ${apiError.message}`);
          }
          
          if (apiError.status === 401 || apiError.status === 403) {
            failureCategory = "AUTH_ERROR";
            if (apiError.message?.toLowerCase().includes("permission denied") || apiError.message?.toLowerCase().includes("quota")) {
               excludedProjects.add(projectId);
            } else {
               await markKeyDisabled(key.id);
               credentialIsDead = true;
            }
          } else if (apiError.status === 404) {
            failureCategory = "MODEL_NOT_FOUND";
            await prisma.projectModelAvailability.update({
              where: { project_id_model_id: { project_id: projectId, model_id: modelConfig.id } },
              data: { status: "UNAVAILABLE" }
            });
          } else if (apiError.status === 429) {
            failureCategory = "RATE_LIMIT";
            excludedProjects.add(projectId);
            await markKeyCooldown(key.id, ROUTER_CONFIG.COOLDOWN_MINUTES);
            credentialIsDead = true; 
          } else if (isTimeout || (apiError.status ?? 0) >= 500 || apiError.message?.includes('fetch failed')) {
            failureCategory = isTimeout ? "TIMEOUT" : "TEMPORARY_BACKEND";
            
            if (key.failure_count >= ROUTER_CONFIG.FAILURE_THRESHOLD - 1) {
               await markKeyCooldown(key.id, ROUTER_CONFIG.COOLDOWN_MINUTES);
               credentialIsDead = true;
            } else {
               await prisma.geminiKey.update({ where: { id: key.id }, data: { failure_count: { increment: 1 } } });
            }
          }

          telemetryLog.push({
            requestId,
            projectId,
            credentialId: key.id,
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
