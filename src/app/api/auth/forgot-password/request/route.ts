import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResetOtpEmail } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_OTP",
        user_id: user.id,
        metadata: JSON.stringify({
          email: user.email,
          otp,
          expiresAt
        })
      }
    });

    await sendResetOtpEmail(user.email, user.full_name, otp);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Forgot password request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
