import { NextResponse } from "next/server";
import { withUsageValidation } from "@/lib/middlewares/withUsage";
import { executeKairoQuery } from "@/lib/services/inference";
import { QueryFeature, ResponseFormat } from "@/lib/services/prompts";
import { logRequestEventInBackground } from "@/lib/services/audit";
import { PageContext, QuestionType } from "@/types/extension-context";

function isValidPageContext(ctx: unknown): ctx is PageContext {
  if (typeof ctx !== 'object' || ctx === null || Array.isArray(ctx)) return false;
  
  const obj = ctx as Record<string, unknown>;
  const allowedFields = new Set([
    'pageTitle', 'pageUrl', 'questionType', 'question', 'options',
    'selectedLanguage', 'constraints', 'inputFormat', 'outputFormat',
    'examples', 'starterCode', 'visibleContext'
  ]);
  
  for (const key of Object.keys(obj)) {
    if (!allowedFields.has(key)) return false;
  }
  
  const validQuestionTypes = new Set(['MCQ', 'CODING', 'NUMERICAL', 'SHORT_ANSWER', 'GENERAL', 'UNKNOWN']);
  if (typeof obj.questionType !== 'string' || !validQuestionTypes.has(obj.questionType)) return false;
  
  if (obj.pageTitle !== undefined && typeof obj.pageTitle !== 'string') return false;
  if (obj.pageUrl !== undefined && typeof obj.pageUrl !== 'string') return false;
  if (obj.question !== undefined && typeof obj.question !== 'string') return false;
  if (obj.constraints !== undefined && typeof obj.constraints !== 'string') return false;
  if (obj.inputFormat !== undefined && typeof obj.inputFormat !== 'string') return false;
  if (obj.outputFormat !== undefined && typeof obj.outputFormat !== 'string') return false;
  if (obj.starterCode !== undefined && typeof obj.starterCode !== 'string') return false;
  if (obj.visibleContext !== undefined && typeof obj.visibleContext !== 'string') return false;
  
  if (obj.options !== undefined) {
    if (!Array.isArray(obj.options) || obj.options.length > 10) return false;
    for (const opt of obj.options) {
      if (typeof opt !== 'object' || opt === null || Array.isArray(opt)) return false;
      if (typeof (opt as any).text !== 'string') return false;
      if ((opt as any).label !== undefined && typeof (opt as any).label !== 'string') return false;
      if ((opt as any).text.length > 500) return false;
    }
  }
  
  if (obj.selectedLanguage !== undefined) {
    if (typeof obj.selectedLanguage !== 'object' || obj.selectedLanguage === null || Array.isArray(obj.selectedLanguage)) return false;
    if (typeof (obj.selectedLanguage as any).normalized !== 'string') return false;
    if (typeof (obj.selectedLanguage as any).display !== 'string') return false;
  }
  
  if (obj.examples !== undefined) {
    if (!Array.isArray(obj.examples) || obj.examples.length > 10) return false;
    for (const ex of obj.examples) {
      if (typeof ex !== 'string' || ex.length > 2000) return false;
    }
  }
  
  if (obj.pageTitle && (obj.pageTitle as string).length > 1000) return false;
  if (obj.pageUrl && (obj.pageUrl as string).length > 1000) return false;
  if (obj.question && (obj.question as string).length > 5000) return false;
  if (obj.constraints && (obj.constraints as string).length > 10000) return false;
  if (obj.starterCode && (obj.starterCode as string).length > 10000) return false;
  if (obj.visibleContext && (obj.visibleContext as string).length > 10000) return false;
  
  return true;
}

async function queryHandler(request: Request) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  
  const headers = new Headers();
  if (isExtension) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  const requestId = request.headers.get("x-kairo-request-id") || "unknown";
  const startTimeStr = request.headers.get("x-kairo-start-time");
  const startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
  const trace = (stage: string, extra = "") => {
    console.log(`[KAIRO_TRACE] requestId=${requestId} stage=${stage} elapsedMs=${Date.now() - startTime} ${extra}`.trim());
  };

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

    if (context !== undefined && typeof context !== 'string' && !isValidPageContext(context)) {
      return NextResponse.json({ error: "Invalid structure for context" }, { status: 400, headers });
    }

    if (!query && feature !== "page_analyze") {
      return NextResponse.json({ error: "Missing query for this feature" }, { status: 400, headers });
    }

    // Server-side bounds checks
    if (query && query.length > 5000) {
      return NextResponse.json({ error: "Query exceeds maximum allowed length" }, { status: 413, headers });
    }

    if (context && typeof context === 'string' && context.length > 15000) {
      return NextResponse.json({ error: "Page context exceeds maximum allowed length" }, { status: 413, headers });
    }
    
    if (context && typeof context === 'object' && JSON.stringify(context).length > 25000) {
      return NextResponse.json({ error: "Structured page context exceeds maximum allowed length" }, { status: 413, headers });
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
      context,
      requestId,
      startTime
    });

    // Phase-6: Fire and Forget Background Tasks
    logRequestEventInBackground(userId, feature, "SUCCESS");

    trace("QUERY_SUCCESS");

    return NextResponse.json({
      success: true,
      data: responseText
    }, { headers });

  } catch (error: unknown) {
    if ((error as Error).message === "AI_TEMPORARILY_UNAVAILABLE") {
      trace("QUERY_503");
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
