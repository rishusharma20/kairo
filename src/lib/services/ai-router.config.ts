export const ROUTER_CONFIG = {
  MAX_ATTEMPTS_PER_MODEL: 3,    // max credential attempts per model priority level
  MAX_TOTAL_ATTEMPTS: 5,        // global cap across all models
  MAX_MODELS_PER_CREDENTIAL: 5, // preserved for legacy compatibility
  PROVIDER_TIMEOUT_MS: 15000,   // per-provider-call timeout
  FAILURE_THRESHOLD: 3,         // circuit breaking threshold
  COOLDOWN_MINUTES: 5,          // temporary cooldown duration
};
