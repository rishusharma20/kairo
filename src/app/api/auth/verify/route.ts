import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp || otp.length !== 6) {
      return NextResponse.json({ error: "Invalid email or OTP" }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Only @gmail.com emails are allowed" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
    }

    // Determine mock tier based on email (for testing premium features)
    let tierId = "FREE";
    if (email.includes("pro")) tierId = "PRO";
    if (email.includes("elite")) tierId = "ELITE";
    
    const limit = tierId === "FREE" ? 100 : 3000;

    // 1. Ensure Plan exists
    await prisma.plan.upsert({
      where: { id: tierId },
      update: {},
      create: {
        id: tierId,
        name: tierId,
        priceMonthly: tierId === "FREE" ? 0 : 9.99,
        dailyQueryLimit: limit,
        priorityRouting: tierId !== "FREE",
      }
    });

    // 2. Upsert User
    const name = email.split("@")[0].toUpperCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name }
    });

    if (user.isSuspended) {
      return NextResponse.json({ error: "Account Suspended" }, { status: 403 });
    }

    // 3. Upsert Subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { planId: tierId },
      create: {
        userId: user.id,
        planId: tierId,
        queriesUsedToday: 0
      }
    });

    // 4. Create Session in DB
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // 5. Create JWT Session Cookie
    await createSession({
      userId: user.id,
      email: user.email,
      tier: tierId as any,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Authentication successful" });
  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
