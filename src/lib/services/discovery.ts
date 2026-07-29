import { prisma } from "@/lib/db";
import { getHealthyCredentialsForProject } from "@/lib/services/pool";
import { MODEL_REGISTRY, getModelsForTask, TaskCategory, ModelConfig } from "@/lib/services/models";
import { decryptKey } from "@/lib/services/encryption";

export async function validateCredentialWithProvider(apiKey: string): Promise<boolean> {
  console.log("[KAIRO_CREDENTIAL_TRACE]\nstage=VALIDATION_START");
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log(`[KAIRO_CREDENTIAL_TRACE]\nstage=PROVIDER_RESPONSE\nstatus=${res.status}`);
    
    if (res.status === 200) {
      console.log("[KAIRO_CREDENTIAL_TRACE]\nstage=VALIDATION_RESULT\nresult=VALID");
      return true;
    }
    // Rate limit 429 means key is structurally valid but exhausted. We still allow adding it.
    if (res.status === 429) {
      console.log("[KAIRO_CREDENTIAL_TRACE]\nstage=VALIDATION_RESULT\nresult=VALID");
      return true;
    }
    console.log("[KAIRO_CREDENTIAL_TRACE]\nstage=VALIDATION_RESULT\nresult=INVALID");
    return false;
  } catch (error: any) {
    console.log(`[KAIRO_CREDENTIAL_TRACE]\nstage=PROVIDER_FETCH_ERROR\nerrorName=${error?.name || 'UnknownError'}`);
    // Network failure during validation
    throw new Error("Failed to contact provider for validation");
  }
}

export async function validateProjectModels(projectId: string) {
  // Select one healthy credential
  const healthyKeys = await getHealthyCredentialsForProject(projectId);
  if (healthyKeys.length === 0) {
    // Cannot validate without a key
    return;
  }
  const key = healthyKeys[0];
  const apiKey = decryptKey(key.encrypted_api_key);

  const approvedModelIds = new Set(MODEL_REGISTRY.map(m => m.id));

  // Determine availability status map
  const availabilityMap = new Map<string, "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN">();

  try {
    // 1. Prefer provider model metadata/listing
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.status === 429 || res.status >= 500) {
      // Temporary errors mean UNKNOWN
      for (const modelId of approvedModelIds) {
        availabilityMap.set(modelId, "UNKNOWN");
      }
    } else if (!res.ok) {
      // Other error e.g. 403 or 400. Treat as UNKNOWN unless we are sure it's unavailable.
      for (const modelId of approvedModelIds) {
        availabilityMap.set(modelId, "UNKNOWN");
      }
    } else {
      const data = await res.json();
      const models = data.models || [];
      interface ProviderModel {
        name: string;
        supportedGenerationMethods?: string[];
      }
      const providerModelMap = new Map<string, ProviderModel>();
      
      for (const m of models) {
        // Model names are returned as "models/gemini-1.5-pro"
        const id = m.name.replace("models/", "");
        providerModelMap.set(id, m);
      }

      for (const modelId of approvedModelIds) {
        if (providerModelMap.has(modelId)) {
          const modelData = providerModelMap.get(modelId);
          // Check if it supports generation methods
          const methods = modelData?.supportedGenerationMethods || [];
          if (methods.includes("generateContent")) {
            availabilityMap.set(modelId, "AVAILABLE");
          } else {
            availabilityMap.set(modelId, "UNAVAILABLE");
          }
        } else {
          availabilityMap.set(modelId, "UNAVAILABLE"); // Missing model
        }
      }
    }
  } catch {
    // Network error -> UNKNOWN
    for (const modelId of approvedModelIds) {
      availabilityMap.set(modelId, "UNKNOWN");
    }
  }

  // Update ProjectModelAvailability in DB
  const now = new Date();
  for (const [modelId, status] of availabilityMap.entries()) {
    await prisma.projectModelAvailability.upsert({
      where: {
        project_id_model_id: {
          project_id: projectId,
          model_id: modelId
        }
      },
      create: {
        project_id: projectId,
        model_id: modelId,
        status: status,
        last_checked_at: now
      },
      update: {
        status: status,
        last_checked_at: now
      }
    });
  }
}

export async function getAvailableModelsForProject(projectId: string, task: TaskCategory): Promise<ModelConfig[]> {
  const availableRecords = await prisma.projectModelAvailability.findMany({
    where: {
      project_id: projectId,
      status: "AVAILABLE"
    }
  });

  const availableIds = new Set(availableRecords.map(r => r.model_id));
  
  // getModelsForTask already returns enabled models ordered by priority
  const taskModels = getModelsForTask(task);
  
  // Return intersection, keeping the priority order from getModelsForTask
  return taskModels.filter(model => availableIds.has(model.id));
}
