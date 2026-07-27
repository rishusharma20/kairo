import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, otp, password } = await request.json();
    if (!email || !otp || !password || typeof email !== 'string' || typeof otp !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const { otp: savedOtp, expiresAt } = JSON.parse(latestOtpLog.metadata || "{}");

    if (savedOtp !== otp.trim()) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: user.id },
        data: { password_hash }
      });

      // Delete/consume the OTP so it can't be used again (or log it as used)
      await tx.auditLog.create({
        data: {
          action: "PASSWORD_RESET_SUCCESS",
          user_id: user.id,
          metadata: JSON.stringify({ email: user.email })
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Forgot password reset error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
