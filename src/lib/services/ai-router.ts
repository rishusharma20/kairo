import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHealthyCredentials, markKeyUsed, markKeyCooldown, markKeyDisabled } from "@/lib/services/pool";
import { getAvailableModelsForProject } from "@/lib/services/discovery";
import { decryptKey } from "@/lib/services/encryption";
import { buildPrompt, QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { ROUTER_CONFIG } from "@/lib/services/ai-router.config";
import type { TaskCategory } from "@/lib/services/models";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { logSystemEventInBackground } from "@/lib/services/audit";

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
  context?: string
): Promise<{ text: string; telemetry: RouterTelemetry[] }> {
  
  const requestId = randomUUID();
  const prompt = buildPrompt({ feature, query, format, context });
  const telemetryLog: RouterTelemetry[] = [];
  
  let totalAttempts = 0;
  let credentialsTried = 0;
  
  const healthyKeys = await getHealthyCredentials();
  
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

  const excludedProjects = new Set<string>();

  for (const projectId of orderedProjects) {
    if (excludedProjects.has(projectId)) continue;
    
    // Check limits
    if (excludedProjects.size >= ROUTER_CONFIG.MAX_PROJECTS_PER_REQUEST) break;

    const projectKeys = keysByProject.get(projectId) || [];
    
    for (const key of projectKeys) {
      if (credentialsTried >= ROUTER_CONFIG.MAX_CREDENTIALS_PER_REQUEST) {
        break; // Stop completely if credential limit reached
      }

      if (excludedProjects.has(projectId)) {
        break; // If a previous key caused this project to be excluded, skip remaining keys
      }

      const availableModels = await getAvailableModelsForProject(projectId, taskType);
      if (availableModels.length === 0) {
        // No available models for this project + task, skip to next project
        excludedProjects.add(projectId);
        break; 
      }

      credentialsTried++;
      let modelsTried = 0;
      let credentialIsDead = false;

      const decryptedKey = decryptKey(key.encrypted_api_key);
      const genAI = new GoogleGenerativeAI(decryptedKey);

      for (const modelConfig of availableModels) {
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
          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("PROVIDER_TIMEOUT")), ROUTER_CONFIG.PROVIDER_TIMEOUT_MS)
            )
          ]);

          const response = await result.response;
          const text = response.text();

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
            logSystemEventInBackground("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
          }
          return { text, telemetry: telemetryLog };

        } catch (err: unknown) {
          const apiError = err as { status?: number; message?: string };
          const latencyMs = Date.now() - startTime;
          let failureCategory = "UNKNOWN_ERROR";

          const isTimeout = err instanceof Error && err.message === "PROVIDER_TIMEOUT";
          
          if (apiError.status === 400) {
            failureCategory = "BAD_REQUEST";
            telemetryLog.push({ requestId, projectId, credentialId: key.id, modelId: modelConfig.id, taskType, attemptNumber: totalAttempts, latencyMs, result: "FAILURE", failureCategory });
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
    logSystemEventInBackground("ROUTER_TELEMETRY", null, { telemetry: telemetryLog });
  }
  throw new Error("AI_UNAVAILABLE: All router attempts exhausted or no available routes.");
}
