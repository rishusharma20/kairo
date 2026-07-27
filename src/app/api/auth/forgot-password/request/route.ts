import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResetOtpEmail } from "@/lib/services/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    // Account enumeration protection: return generic success even if user not found.
    if (!user) {
      // Simulate delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 300));
      return NextResponse.json({ success: true, message: "If an account exists for this email, a verification code has been sent." });
    }

    // Cooldown check: 60 seconds limit
    const latestRequest = await prisma.auditLog.findFirst({
      where: {
        action: "PASSWORD_RESET_OTP",
        user_id: user.id
      },
      orderBy: { created_at: "desc" }
    });

    if (latestRequest && (Date.now() - latestRequest.created_at.getTime() < 60 * 1000)) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code." },
        { status: 429 }
      );
    }

    // Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_OTP",
        user_id: user.id,
        metadata: JSON.stringify({
          email: user.email,
          otpHash,
          expiresAt,
          attempts: 0,
          used: false
        })
      }
    });

    // Send email using centralized Nodemailer service
    await sendResetOtpEmail(user.email, user.full_name, otp);

    return NextResponse.json({ success: true, message: "If an account exists for this email, a verification code has been sent." });
  } catch (error: unknown) {
    console.error("Forgot password request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
