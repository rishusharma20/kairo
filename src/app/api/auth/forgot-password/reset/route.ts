import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, resetToken, password } = await request.json();
    if (!email || !resetToken || !password || typeof email !== 'string' || typeof resetToken !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the matching authorization token
    const latestAuthLog = await prisma.auditLog.findFirst({
      where: {
        action: "PASSWORD_RESET_AUTHORIZED",
        user_id: user.id
      },
      orderBy: {
        created_at: "desc"
      }
    });

    if (!latestAuthLog) {
      return NextResponse.json({ error: "Reset authorization not found or expired." }, { status: 400 });
    }

    const metadata = JSON.parse(latestAuthLog.metadata || "{}");

    if (metadata.resetToken !== resetToken.trim()) {
      return NextResponse.json({ error: "Invalid reset authorization token." }, { status: 400 });
    }

    if (metadata.used) {
      return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 });
    }

    if (new Date(metadata.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset authorization has expired." }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: user.id },
        data: { password_hash }
      });

      // Mark token as used
      await tx.auditLog.update({
        where: { id: latestAuthLog.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            used: true
          })
        }
      });
      
      // Log successful reset event
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
