/**
 * Background Execution Engine
 * Executes tasks asynchronously and guarantees error isolation and retry logic.
 */
export function runInBackground(
  taskName: string,
  taskFn: () => Promise<void>,
  maxRetries: number = 3,
  baseDelayMs: number = 250
): Promise<void> {
  // Fire and forget execution context
  return Promise.resolve().then(async () => {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        await taskFn();
        return; // Success, exit loop
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          // Final failure, silently fail to protect the main thread
          console.error(`[Background Task: ${taskName}] FAILED completely after ${maxRetries} retries.`, error);
          return;
        }
        
        // Exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, attempts);
        console.warn(`[Background Task: ${taskName}] Attempt ${attempts} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }).catch((fatalError) => {
    // Ultimate fallback catch to ensure V8 loop is never disrupted
    console.error(`[Background Engine] FATAL EXCEPTION in task: ${taskName}`, fatalError);
  });
}
