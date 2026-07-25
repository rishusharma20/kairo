import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    
    // Lazily enforce plan expiration upon login
    const { enforcePlanExpiration } = await import("@/lib/services/plan");
    user = await enforcePlanExpiration(user.id) as typeof user;

    if (user.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Account is blocked" },
        { status: 403 }
      );
    }

    if (user.status === "DELETED") {
      return NextResponse.json(
        { error: "Account is deleted" },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      status: user.status,
      createdAt: user.created_at.toISOString(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        status: user.status,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
