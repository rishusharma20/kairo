import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { fullName, email, password, otp } = await request.json();

    if (!fullName || !email || !password || !otp) {
      return NextResponse.json(
        { error: "Missing required fields (including OTP)" },
        { status: 400 }
      );
    }

    if (typeof fullName !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof otp !== 'string') {
      return NextResponse.json(
        { error: "Invalid field types" },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    // Verify OTP
    const latestOtpLog = await prisma.auditLog.findFirst({
      where: {
        action: "SIGNUP_OTP",
        metadata: {
          contains: `"email":"${emailTrimmed}"`
        }
      },
      orderBy: { created_at: "desc" }
    });

    if (!latestOtpLog) {
      return NextResponse.json({ error: "No verification code requested for this email." }, { status: 400 });
    }

    const metadata = JSON.parse(latestOtpLog.metadata || "{}");

    if (metadata.attempts >= 5 || metadata.used) {
      return NextResponse.json({ error: "This verification code has been invalidated due to too many failed attempts or reuse." }, { status: 400 });
    }

    const submittedOtpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    if (metadata.otpHash !== submittedOtpHash) {
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Atomically create user and assign a Gemini key
    const result = await prisma.$transaction(async (tx) => {
      // Find an available key
      const availableKey = await tx.geminiKey.findFirst({
        where: { status: "AVAILABLE" },
        orderBy: { priority: "desc" },
      });

      if (!availableKey) {
        throw new Error("NO_KEYS_AVAILABLE");
      }

      // Create the user
      const user = await tx.user.create({
        data: {
          full_name: fullName,
          email,
          password_hash,
          plan: "FREE",
          status: "ACTIVE",
          daily_limit: 1,
        },
      });

      // Update the Gemini key status
      const updatedKey = await tx.geminiKey.update({
        where: { id: availableKey.id },
        data: {
          status: "ASSIGNED",
          assigned_user_id: user.id,
        },
      });

      // Log the assignment history
      await tx.userKeyAssignment.create({
        data: {
          user_id: user.id,
          gemini_key_id: updatedKey.id,
          release_reason: "REGISTER",
        },
      });

      return user;
    });

    // Create session
    await createSession({
      userId: result.id,
      email: result.email,
      plan: result.plan as "FREE" | "PREMIUM",
      status: result.status as "ACTIVE" | "BLOCKED" | "DELETED",
      createdAt: result.created_at.toISOString(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        plan: result.plan,
        status: result.status,
      },
    });

  } catch (error: unknown) {
    if ((error as Error).message === "NO_KEYS_AVAILABLE") {
      return NextResponse.json(
        { error: "No available Gemini API keys. Please try again later." },
        { status: 503 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
