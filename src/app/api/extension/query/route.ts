import { NextResponse } from "next/server";
import { withUsageValidation } from "@/lib/middlewares/withUsage";
import { processGeminiQuery } from "@/lib/services/gemini";
import { getSession } from "@/lib/auth";
import { QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { incrementUsageInBackground } from "@/lib/services/usage";
import { logRequestEventInBackground } from "@/lib/services/audit";

async function queryHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const body = await request.json();
    const { feature, query, format, context } = body;

    if (!feature || !query || !format) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validFeatures = ["ask", "page", "text"];
    const validFormats = ["MCQ", "Coding", "Interview", "General"];

    if (!validFeatures.includes(feature)) {
      return NextResponse.json({ error: "Invalid feature requested" }, { status: 400 });
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: "Invalid format requested" }, { status: 400 });
    }

    // Process the query using Phase-4 Key Rotation and Phase-5 Gemini Engine
    const responseText = await processGeminiQuery(
      session.userId,
      feature as QueryFeature,
      query,
      format as ResponseFormat,
      context
    );

    // Phase-6: Fire and Forget Background Tasks
    incrementUsageInBackground(session.userId);
    logRequestEventInBackground(session.userId, feature, "SUCCESS");

    return NextResponse.json({
      success: true,
      data: responseText
    });

  } catch (error: any) {
    if (error.message === "No healthy Gemini key available.") {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Query Handler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Wrap with Phase-3 Usage Limits (which includes Auth checks internally)
export const POST = withUsageValidation(queryHandler);
