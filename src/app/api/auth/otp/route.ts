import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Only @gmail.com emails are allowed" }, { status: 400 });
    }

    // In a real application, we would generate a 6 digit code here,
    // store it in Redis with a 10 minute TTL, and send it via email/SMS.
    // For Phase 10 design, we simulate a successful send.
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
