export type TaskCategory = "MCQ" | "CODING" | "GENERAL";

export interface ModelCapabilities {
  textOutput: boolean;
  coding: boolean;
  mcq: boolean;
  generalText: boolean;
}

export interface ModelConfig {
  id: string;
  provider: string;
  priority: number;
  enabled: boolean;
  capabilities: ModelCapabilities;
}

/**
 * Server-side static Model Registry.
 * Configuration should only be modified here.
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    priority: 1,
    enabled: true,
    capabilities: { textOutput: true, coding: true, mcq: true, generalText: true }
  },
  {
    id: "gemini-3.6-flash",
    provider: "google",
    priority: 2,
    enabled: true,
    capabilities: { textOutput: true, coding: true, mcq: true, generalText: true }
  },
  {
    id: "gemini-3.5-flash",
    provider: "google",
    priority: 3,
    enabled: true,
    capabilities: { textOutput: true, coding: true, mcq: true, generalText: true }
  },
  {
    id: "gemma-4-31b-it",
    provider: "google",
    priority: 4,
    enabled: true,
    capabilities: { textOutput: true, coding: true, mcq: true, generalText: true }
  },
  {
    id: "gemma-4-26b-a4b-it",
    provider: "google",
    priority: 5,
    enabled: true,
    capabilities: { textOutput: true, coding: true, mcq: true, generalText: true }
  }
];

/**
 * Returns all enabled models ordered by priority ascending.
 */
export function getEnabledModels(): ModelConfig[] {
  return MODEL_REGISTRY
    .filter(model => model.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Returns all enabled models, completely ignoring task category to guarantee
 * deterministic global model priority.
 */
export function getModelsForTask(task: TaskCategory): ModelConfig[] {
  return getEnabledModels();
}
