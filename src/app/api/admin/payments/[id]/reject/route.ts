import { NextResponse } from "next/server";
import { withAdminValidation } from "@/lib/middlewares/withAdmin";
import { rejectPayment } from "@/lib/services/payment";

async function handler(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const result = await rejectPayment(id, "admin-system");
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const POST = withAdminValidation(handler);
