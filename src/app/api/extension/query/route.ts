import { NextResponse } from "next/server";
import { withUsageValidation } from "@/lib/middlewares/withUsage";
import { executeKairoQuery } from "@/lib/services/inference";
import { QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { logRequestEventInBackground } from "@/lib/services/audit";

async function queryHandler(request: Request) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  
  const headers = new Headers();
  if (isExtension) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  try {
    const userId = request.headers.get("x-kairo-user-id");
    if (!userId) throw new Error("Unauthorized");

    const body = await request.json();
    const { feature, query, format, context } = body;

    if (!feature || format === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers });
    }

    if (typeof feature !== 'string' || typeof format !== 'string') {
      return NextResponse.json({ error: "Invalid types for feature or format" }, { status: 400, headers });
    }

    if (query !== undefined && typeof query !== 'string') {
      return NextResponse.json({ error: "Invalid type for query" }, { status: 400, headers });
    }

    if (context !== undefined && typeof context !== 'string') {
      return NextResponse.json({ error: "Invalid type for context" }, { status: 400, headers });
    }

    if (!query && feature !== "page_analyze") {
      return NextResponse.json({ error: "Missing query for this feature" }, { status: 400, headers });
    }

    // Server-side bounds checks
    if (query && query.length > 5000) {
      return NextResponse.json({ error: "Query exceeds maximum allowed length" }, { status: 413, headers });
    }

    if (context && context.length > 15000) {
      return NextResponse.json({ error: "Page context exceeds maximum allowed length" }, { status: 413, headers });
    }

    const validFeatures = ["ask", "page", "text", "page_analyze"];
    const validFormats = ["MCQ", "Coding", "Interview", "General"];

    if (!validFeatures.includes(feature)) {
      return NextResponse.json({ error: "Invalid feature requested" }, { status: 400, headers });
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: "Invalid format requested" }, { status: 400, headers });
    }

    const responseText = await executeKairoQuery({
      userId,
      feature: feature as QueryFeature,
      query,
      format: format as ResponseFormat,
      context
    });

    // Phase-6: Fire and Forget Background Tasks
    logRequestEventInBackground(userId, feature, "SUCCESS");

    return NextResponse.json({
      success: true,
      data: responseText
    }, { headers });

  } catch (error: unknown) {
    if ((error as Error).message === "AI_TEMPORARILY_UNAVAILABLE") {
      return NextResponse.json({ error: (error as Error).message }, { status: 503, headers });
    }

    console.error("Query Handler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers });
  }
}

// Wrap with Phase-3 Usage Limits (which includes Auth checks internally)
export const POST = withUsageValidation(queryHandler);

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  
  const headers = new Headers();
  if (isExtension) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return new NextResponse(null, { status: 204, headers });
}
