import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

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

  } catch (error: any) {
    if (error.message === "NO_KEYS_AVAILABLE") {
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
