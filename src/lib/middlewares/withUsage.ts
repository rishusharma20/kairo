import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyUsageLimits, DailyLimitExceededError } from "@/lib/services/usage";

/**
 * Higher-order function to wrap future Next.js Route Handlers.
 * Automatically handles Phase-2 Authentication and Phase-3 Usage Limits.
 */
export function withUsageValidation<T extends unknown[]>(handler: (request: Request, ...args: T) => Promise<Response>) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const isExtension = origin.startsWith('chrome-extension://');
    
    const headers = new Headers();
    if (isExtension) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    try {
      const session = await getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
      }

      if (session.status === "BLOCKED" || session.status === "DELETED") {
        return NextResponse.json({ error: "Forbidden: Invalid user state" }, { status: 403, headers });
      }

      // Atomically check limits and reset counters if it's a new day (without incrementing)
      const limitsResult = await verifyUsageLimits(session.userId);

      // Attach session payload to request headers to avoid duplicate getSession
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-kairo-user-id", session.userId);
      requestHeaders.set("x-kairo-plan", session.plan);
      requestHeaders.set("x-kairo-daily-limit", String(limitsResult.daily_limit));
      
      const modifiedRequest = new Request(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
        duplex: 'half' // required for node-fetch with streaming body in Next.js
      } as RequestInit & { duplex: 'half' });

      // Continue to the actual API handler
      return await handler(modifiedRequest, ...args);

    } catch (error) {
      if (error instanceof DailyLimitExceededError) {
        return NextResponse.json({ error: (error as Error).message }, { status: 429, headers });
      }

      console.error("Usage Validation Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers });
    }
  };
}
