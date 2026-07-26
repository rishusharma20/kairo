import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { approvePayment } from "@/lib/services/payment";

async function handler(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // In a real application, adminId might be extracted from the request headers or context.
    // Here we use a placeholder or extract from session if available.
    // For now, withAdminValidation simply checks the API key, so we'll use a standard admin ID.
    const result = await approvePayment(id, "admin-system");
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export const POST = withAdminValidation(handler);
