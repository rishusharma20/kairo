import { NextResponse } from "next/server";
import { withUsageValidation } from "@/lib/middlewares/withUsage";
import { processGeminiQuery } from "@/lib/services/gemini";
import { QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { atomicReserveUsage, refundUsage } from "@/lib/services/usage";
import { logRequestEventInBackground } from "@/lib/services/audit";

async function queryHandler(request: Request) {
  try {
    const userId = request.headers.get("x-kairo-user-id");
    if (!userId) throw new Error("Unauthorized");

    const body = await request.json();
    const { feature, query, format, context } = body;

    if (!feature || format === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof feature !== 'string' || typeof format !== 'string') {
      return NextResponse.json({ error: "Invalid types for feature or format" }, { status: 400 });
    }

    if (query !== undefined && typeof query !== 'string') {
      return NextResponse.json({ error: "Invalid type for query" }, { status: 400 });
    }

    if (context !== undefined && typeof context !== 'string') {
      return NextResponse.json({ error: "Invalid type for context" }, { status: 400 });
    }

    if (!query && feature !== "page_analyze") {
      return NextResponse.json({ error: "Missing query for this feature" }, { status: 400 });
    }

    // Server-side bounds checks
    if (query && query.length > 5000) {
      return NextResponse.json({ error: "Query exceeds maximum allowed length" }, { status: 413 });
    }

    if (context && context.length > 15000) {
      return NextResponse.json({ error: "Page context exceeds maximum allowed length" }, { status: 413 });
    }

    const validFeatures = ["ask", "page", "text", "page_analyze"];
    const validFormats = ["MCQ", "Coding", "Interview", "General"];

    if (!validFeatures.includes(feature)) {
      return NextResponse.json({ error: "Invalid feature requested" }, { status: 400 });
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: "Invalid format requested" }, { status: 400 });
    }

    // Phase-4: Atomic Quota Reservation
    await atomicReserveUsage(userId);

    let responseText;
    try {
      // Process the query using Phase-4 Key Rotation and Phase-5 Gemini Engine
      responseText = await processGeminiQuery(
        userId,
        feature as QueryFeature,
        query,
        format as ResponseFormat,
        context
      );
    } catch (error) {
      await refundUsage(userId);
      throw error;
    }

    // Phase-6: Fire and Forget Background Tasks
    logRequestEventInBackground(userId, feature, "SUCCESS");

    return NextResponse.json({
      success: true,
      data: responseText
    });

  } catch (error: unknown) {
    if ((error as Error).message === "No healthy Gemini key available.") {
      return NextResponse.json({ error: (error as Error).message }, { status: 503 });
    }

    console.error("Query Handler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Wrap with Phase-3 Usage Limits (which includes Auth checks internally)
export const POST = withUsageValidation(queryHandler);
