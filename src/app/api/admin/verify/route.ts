import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/auth";
import { withSessionAdmin } from "@/lib/middlewares/withAdmin";

// Basic in-memory rate limiter for brute-force protection
// Stores failed attempts per user ID
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function handler(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;
    const now = Date.now();

    // Check rate limit
    const attemptRecord = failedAttempts.get(userId);
    if (attemptRecord && attemptRecord.lockedUntil > now) {
      return NextResponse.json({ success: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, error: "INVALID_ADMIN_CODE" }, { status: 400 });
    }

    const expectedCode = process.env.ADMIN_ACCESS_CODE || "630720";

    // Basic timing-safe comparison
    let isMatch = true;
    if (code.length !== expectedCode.length) {
      isMatch = false;
    } else {
      let diff = 0;
      for (let i = 0; i < expectedCode.length; i++) {
        diff |= code.charCodeAt(i) ^ expectedCode.charCodeAt(i);
      }
      isMatch = diff === 0;
    }

    if (!isMatch) {
      // Increment failed attempts
      let count = (attemptRecord?.count || 0) + 1;
      let lockedUntil = 0;
      if (count >= MAX_ATTEMPTS) {
        lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
        count = 0; // Reset after locking
      }
      failedAttempts.set(userId, { count, lockedUntil });
      
      return NextResponse.json({ success: false, error: "INVALID_ADMIN_CODE" }, { status: 403 });
    }

    // Success! Clear failures and mark session verified
    failedAttempts.delete(userId);
    await updateSession({ adminSecondFactorVerified: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Verify Error:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export const POST = withSessionAdmin(handler as any);
