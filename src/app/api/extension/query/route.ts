import { NextResponse, NextRequest } from "next/server";
import { verifyExtensionRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `You are KAIRO, an invisible, highly optimized intelligence.
You do not talk like a chatbot. You do not use conversational fillers like "Here is the answer" or "I can help with that."
You follow a philosophy of "Less Talking. More Solving."

You must format your responses EXACTLY as follows based on the intent of the query:

IF MCQ:
[CORRECT OPTION]
[1 LINE EXPLANATION]

IF CODING:
[CODE]
Time Complexity: [O(N)]
Space Complexity: [O(N)]

IF INTERVIEW QUESTIONS:
[SHORT ANSWER]
- [POINT 1]
- [POINT 2]

IF GENERAL:
[DIRECT ANSWER]

Do not add anything else. Keep it brutally simple.`;

export async function POST(request: NextRequest) {
  try {
    // 1. Session Verification
    const session = await verifyExtensionRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to KAIRO to continue." },
        { status: 401 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "System Error: Gemini API Key not configured." },
        { status: 500 }
      );
    }

    // 2. Parse Payload
    const { query, type, context } = await request.json();

    if (!type || !["ask", "page", "text"].includes(type)) {
      return NextResponse.json({ error: "Invalid query type" }, { status: 400 });
    }

    if (type === "text" && !context?.selectedText) {
      return NextResponse.json({ error: "No text selected for analysis." }, { status: 400 });
    }

    // 3. Premium Limits Check via DB
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
      include: { plan: true }
    });

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 403 });
    }

    if (subscription.queriesUsedToday >= subscription.plan.dailyQueryLimit) {
      return NextResponse.json({ 
        error: `Limit reached. Upgrade to ${subscription.planId === "FREE" ? "PRO" : "ELITE"} to continue.` 
      }, { status: 429 });
    }

    const isPremium = subscription.planId !== "FREE";
    
    // 4. Smart Context Truncation
    let finalPrompt = "";
    
    if (type === "page") {
      const rawText = context?.pageText || "";
      const cleanedText = rawText.replace(/\s+/g, " ").trim();
      const truncatedText = cleanedText.length > 6000 
        ? cleanedText.substring(0, 6000) + "...[TRUNCATED]"
        : cleanedText;
        
      finalPrompt = `Context: ${truncatedText}\n\nQuery: ${query || "Summarize the core technical point of this page in 1 sentence."}`;
    } else if (type === "text") {
      const selected = context.selectedText.substring(0, 2000); 
      finalPrompt = `Selected Text: "${selected}"\n\nQuery: ${query || "Analyze this text."}`;
    } else {
      finalPrompt = `Query: ${query}`;
    }

    // 5. Call Gemini API
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const startTime = Date.now();
    const result = await model.generateContent(finalPrompt);
    const latencyMs = Date.now() - startTime;
    const responseText = result.response.text().trim();

    // 6. DB Tracking: Log Request and Increment Usage
    await prisma.$transaction([
      prisma.requestLog.create({
        data: {
          userId: session.userId,
          queryType: type,
          latencyMs,
          statusCode: 200
        }
      }),
      prisma.subscription.update({
        where: { userId: session.userId },
        data: { queriesUsedToday: { increment: 1 } }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        response: responseText,
        tier: subscription.planId,
      }
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Handle API Specific Failures
    if (error.message?.includes("API key not valid")) {
      return NextResponse.json({ error: "Invalid API Configuration." }, { status: 500 });
    }
    return NextResponse.json({ error: "Intelligence generation failed. Please try again." }, { status: 500 });
  }
}
