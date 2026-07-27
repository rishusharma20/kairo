import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const latestOtpLog = await prisma.auditLog.findFirst({
      where: {
        action: "PASSWORD_RESET_OTP",
        user_id: user.id
      },
      orderBy: {
        created_at: "desc"
      }
    });

    if (!latestOtpLog) {
      return NextResponse.json({ error: "No verification code requested." }, { status: 400 });
    }

    const metadata = JSON.parse(latestOtpLog.metadata || "{}");

    // Brute-force & Reuse prevention
    if (metadata.attempts >= 5 || metadata.used) {
      return NextResponse.json({ error: "This verification code has been invalidated due to too many failed attempts or reuse." }, { status: 400 });
    }

    const submittedOtpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    if (metadata.otpHash !== submittedOtpHash) {
      // Increment attempts
      await prisma.auditLog.update({
        where: { id: latestOtpLog.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            attempts: (metadata.attempts || 0) + 1
          })
        }
      });
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    // Expiry check
    if (new Date(metadata.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.auditLog.update({
      where: { id: latestOtpLog.id },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          used: true
        })
      }
    });

    // Generate reset authorization token (32 cryptographically secure hex bytes)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Persist reset authorization state securely in AuditLog
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_AUTHORIZED",
        user_id: user.id,
        metadata: JSON.stringify({
          email: user.email,
          resetToken,
          used: false,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })
      }
    });

    return NextResponse.json({ success: true, resetToken });
  } catch (error: unknown) {
    console.error("Forgot password verify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
