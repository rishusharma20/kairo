import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    const { otp: savedOtp, expiresAt } = JSON.parse(latestOtpLog.metadata || "{}");

    if (savedOtp !== otp.trim()) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code has expired." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Forgot password verify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
