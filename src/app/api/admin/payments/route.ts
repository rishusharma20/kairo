import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { getPaymentRequests } from "@/lib/services/payment";

async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null;
    const payments = await getPaymentRequests(status || undefined);
    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withAdminValidation(handler);
