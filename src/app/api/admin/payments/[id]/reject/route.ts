import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { rejectPayment } from "@/lib/services/payment";

async function handler(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await rejectPayment(id, "admin-system");
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export const POST = withAdminValidation(handler);
