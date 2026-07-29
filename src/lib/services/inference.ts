import { atomicReserveUsage, refundUsage } from "@/lib/services/usage";
import { executeSharedAiRoute } from "@/lib/services/ai-router";
import type { QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import type { TaskCategory } from "@/lib/services/models";
import { PageContext } from "@/types/extension-context";

export async function executeKairoQuery({
  userId,
  feature,
  query,
  format,
  context,
  requestId = "unknown",
  startTime = Date.now()
}: {
  userId: string;
  feature: QueryFeature;
  query: string;
  format: ResponseFormat;
  context?: string | PageContext;
  requestId?: string;
  startTime?: number;
}) {
  const trace = (stage: string, extra = "") => {
    console.log(`[KAIRO_TRACE] requestId=${requestId} stage=${stage} elapsedMs=${Date.now() - startTime} ${extra}`.trim());
  };

  trace("INFERENCE_ENTER");
  // 1. Reserve Kairo user quota EXACTLY ONCE
  trace("USAGE_RESERVE_START");
  await atomicReserveUsage(userId);
  trace("USAGE_RESERVED");

  try {
    // Shared Infrastructure Routing
    const taskCategory: TaskCategory = format === 'Coding' ? 'CODING' : 'GENERAL';
    trace("ROUTER_CALL_START");
    const result = await executeSharedAiRoute(
      taskCategory,
      feature,
      query,
      format,
      context,
      requestId,
      startTime
    );
    
    return result.text;
  } catch (error: unknown) {
    // 2. Refund EXACTLY ONCE on complete provider failure
    trace("REFUND_START");
    await refundUsage(userId);
    trace("REFUND_SUCCESS");
    
    // 3. Error Sanitization
    const msg = (error as Error).message || "";
    
    if (msg.includes("400 Bad Request") || msg.includes("BAD_REQUEST")) {
      throw new Error("BAD_REQUEST");
    }
    if (msg.includes("UNAUTHORIZED") || msg.includes("AUTH_ERROR")) {
      throw new Error("UNAUTHORIZED");
    }
    if (msg.includes("AI_UNAVAILABLE") || msg.includes("No healthy Gemini key") || msg.includes("exhausted") || msg.includes("routes")) {
      throw new Error("AI_TEMPORARILY_UNAVAILABLE");
    }

    // Default sanitized error
    throw new Error("AI_TEMPORARILY_UNAVAILABLE");
  }
}
