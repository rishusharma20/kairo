import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { searchUsers } from "@/lib/services/admin";

async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const plan = url.searchParams.get("plan") || undefined;
    const id = url.searchParams.get("id") || undefined;

    const users = await searchUsers({ email, status, plan, id });

    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    console.error("Admin Users Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withAdminValidation(handler);
