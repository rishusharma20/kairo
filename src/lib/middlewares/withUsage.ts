import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyUsageLimits, DailyLimitExceededError } from "@/lib/services/usage";

/**
 * Higher-order function to wrap future Next.js Route Handlers.
 * Automatically handles Phase-2 Authentication and Phase-3 Usage Limits.
 */
export function withUsageValidation(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    try {
      const session = await getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (session.status === "BLOCKED" || session.status === "DELETED") {
        return NextResponse.json({ error: "Forbidden: Invalid user state" }, { status: 403 });
      }

      // Atomically check limits and reset counters if it's a new day (without incrementing)
      await verifyUsageLimits(session.userId);

      // Continue to the actual API handler
      return await handler(request, ...args);

    } catch (error) {
      if (error instanceof DailyLimitExceededError) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }

      console.error("Usage Validation Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
