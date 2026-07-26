import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { getAuditLogs } from "@/lib/services/admin";

async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const logs = await getAuditLogs(limit, offset);

    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    console.error("Admin Audit Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withAdminValidation(handler);
